import { agreements, billingEmailTemplates, db } from '@/server/db';
import { logAudit } from '@/server/utils/audit-logger';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { findUnknownTemplateVariables } from '@/utils/billing-email-template-variables';
import { tsr } from '@ts-rest/serverless/next';
import { eq, sql } from 'drizzle-orm';
import { contract } from '../contracts';

type BillingEmailTemplateColumn = keyof typeof billingEmailTemplates.$inferSelect;

const BILLING_EMAIL_TEMPLATE_FIELDS: FieldMap = {
  id: billingEmailTemplates.id,
  name: billingEmailTemplates.name,
  fromEmail: billingEmailTemplates.fromEmail,
  subject: billingEmailTemplates.subject,
  isActive: billingEmailTemplates.isActive,
  createdAt: billingEmailTemplates.createdAt,
  updatedAt: billingEmailTemplates.updatedAt,
} satisfies Partial<
  Record<BillingEmailTemplateColumn, (typeof billingEmailTemplates)[BillingEmailTemplateColumn]>
>;

const BILLING_EMAIL_TEMPLATE_QUERY_CONFIG: QueryConfig = {
  fields: BILLING_EMAIL_TEMPLATE_FIELDS,
  searchFields: [
    billingEmailTemplates.name,
    billingEmailTemplates.subject,
    billingEmailTemplates.fromEmail,
  ],
  defaultSort: { column: billingEmailTemplates.createdAt, order: 'desc' },
};

const BILLING_EMAIL_TEMPLATE_INCLUDES = createIncludeMap<typeof db.query.billingEmailTemplates>()({
  agreements: {
    relation: 'agreements',
    config: true,
  },
});

type CreateTemplatePayload = {
  name: string;
  fromEmail: string;
  subject: string;
  htmlContent: string;
  isActive: boolean;
};

type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

function normalizeCreatePayload(payload: CreateTemplatePayload): CreateTemplatePayload {
  return {
    ...payload,
    name: payload.name.trim(),
    fromEmail: payload.fromEmail.trim().toLowerCase(),
    subject: payload.subject.trim(),
    htmlContent: payload.htmlContent.trim(),
  };
}

function normalizeUpdatePayload(payload: UpdateTemplatePayload): UpdateTemplatePayload {
  return {
    ...payload,
    name: payload.name === undefined ? undefined : payload.name.trim(),
    fromEmail:
      payload.fromEmail === undefined ? undefined : payload.fromEmail.trim().toLowerCase(),
    subject: payload.subject === undefined ? undefined : payload.subject.trim(),
    htmlContent: payload.htmlContent === undefined ? undefined : payload.htmlContent.trim(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

function ensureTemplateVariablesValid(params: {
  subject?: string;
  htmlContent?: string;
}) {
  const unknown = new Set<string>();

  if (params.subject !== undefined) {
    for (const value of findUnknownTemplateVariables(params.subject)) {
      unknown.add(value);
    }
  }

  if (params.htmlContent !== undefined) {
    for (const value of findUnknownTemplateVariables(params.htmlContent)) {
      unknown.add(value);
    }
  }

  if (!unknown.size) return;

  throwHttpError({
    status: 400,
    message: `Variables de plantilla no soportadas: ${[...unknown].join(', ')}`,
    code: 'BAD_REQUEST',
  });
}

async function ensureTemplateNotLinked(templateId: number) {
  const linkedAgreement = await db.query.agreements.findFirst({
    where: eq(agreements.billingEmailTemplateId, templateId),
    columns: { id: true, agreementCode: true, businessName: true },
  });

  if (!linkedAgreement) return;

  throwHttpError({
    status: 400,
    message: `La plantilla esta asignada al convenio ${linkedAgreement.agreementCode} - ${linkedAgreement.businessName}`,
    code: 'BAD_REQUEST',
  });
}

export const billingEmailTemplate = tsr.router(contract.billingEmailTemplate, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;
      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, BILLING_EMAIL_TEMPLATE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.billingEmailTemplates.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, BILLING_EMAIL_TEMPLATE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(billingEmailTemplates)
          .where(whereClause),
      ]);

      const totalCount = countResult[0]?.count ?? 0;
      return {
        status: 200 as const,
        body: {
          data,
          meta: buildPaginationMeta(totalCount, page, limit),
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al listar plantillas de correo',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const item = await db.query.billingEmailTemplates.findFirst({
        where: eq(billingEmailTemplates.id, id),
        with: buildTypedIncludes(query?.include, BILLING_EMAIL_TEMPLATE_INCLUDES),
      });

      if (!item) {
        throwHttpError({
          status: 404,
          message: 'not found',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200 as const, body: item };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener plantilla ${id}`,
      });
    }
  },

  create: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const payload = normalizeCreatePayload(body);
      ensureTemplateVariablesValid({
        subject: payload.subject,
        htmlContent: payload.htmlContent,
      });
      const [created] = await db.insert(billingEmailTemplates).values(payload).returning();

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: created.id.toString(),
        resourceLabel: created.name,
        status: 'success',
        afterValue: created,
        ipAddress,
        userAgent,
      });

      return { status: 201 as const, body: created };
    } catch (e) {
      if (isUniqueViolation(e)) {
        return {
          status: 409 as const,
          body: {
            message: 'Ya existe una plantilla con ese nombre',
            code: 'CONFLICT',
          },
        };
      }

      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear plantilla de correo',
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        status: 'failure',
        errorMessage: error.body.message,
        metadata: { body },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

  update: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const existing = await db.query.billingEmailTemplates.findFirst({
        where: eq(billingEmailTemplates.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Plantilla con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      if (body.isActive === false && existing.isActive) {
        await ensureTemplateNotLinked(existing.id);
      }

      const payload = normalizeUpdatePayload(body);
      ensureTemplateVariablesValid({
        subject: payload.subject,
        htmlContent: payload.htmlContent,
      });
      const [updated] = await db
        .update(billingEmailTemplates)
        .set(payload)
        .where(eq(billingEmailTemplates.id, id))
        .returning();

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: existing.name,
        status: 'success',
        beforeValue: existing,
        afterValue: updated,
        ipAddress,
        userAgent,
      });

      return { status: 200 as const, body: updated };
    } catch (e) {
      if (isUniqueViolation(e)) {
        return {
          status: 409 as const,
          body: {
            message: 'Ya existe una plantilla con ese nombre',
            code: 'CONFLICT',
          },
        };
      }

      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar plantilla ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        metadata: { body },
        ipAddress,
        userAgent,
      });

      return error;
    }
  },

  delete: async ({ params: { id } }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');

    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const existing = await db.query.billingEmailTemplates.findFirst({
        where: eq(billingEmailTemplates.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Plantilla con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      await ensureTemplateNotLinked(existing.id);
      await db.delete(billingEmailTemplates).where(eq(billingEmailTemplates.id, id));

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: existing.name,
        status: 'success',
        beforeValue: existing,
        ipAddress,
        userAgent,
      });

      return { status: 200 as const, body: existing };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar plantilla ${id}`,
      });

      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: error.body.message,
        ipAddress,
        userAgent,
      });

      return error;
    }
  },
});
