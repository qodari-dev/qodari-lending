import { db, documentTemplates, templateSignerRules } from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { asc, eq, sql } from 'drizzle-orm';
import { contract } from '../contracts';

import { logAudit } from '@/server/utils/audit-logger';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { getClientIp } from '@/server/utils/get-client-ip';
import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';

type DocumentTemplateColumn = keyof typeof documentTemplates.$inferSelect;

const DOCUMENT_TEMPLATE_FIELDS: FieldMap = {
  id: documentTemplates.id,
  code: documentTemplates.code,
  name: documentTemplates.name,
  version: documentTemplates.version,
  status: documentTemplates.status,
  contentFormat: documentTemplates.contentFormat,
  createdAt: documentTemplates.createdAt,
  updatedAt: documentTemplates.updatedAt,
} satisfies Partial<
  Record<DocumentTemplateColumn, (typeof documentTemplates)[DocumentTemplateColumn]>
>;

const DOCUMENT_TEMPLATE_QUERY_CONFIG: QueryConfig = {
  fields: DOCUMENT_TEMPLATE_FIELDS,
  searchFields: [documentTemplates.code, documentTemplates.name],
  defaultSort: { column: documentTemplates.createdAt, order: 'desc' },
};

const DOCUMENT_TEMPLATE_INCLUDES = createIncludeMap<typeof db.query.documentTemplates>()({
  templateSignerRules: {
    relation: 'templateSignerRules',
    config: {
      orderBy: [asc(templateSignerRules.signOrder)],
    },
  },
  creditProductDocumentRules: {
    relation: 'creditProductDocumentRules',
    config: {
      with: {
        creditProduct: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    },
  },
});

function normalizeTemplateBody(params: {
  contentFormat: 'HTML_HBS' | 'PDF_STATIC';
  templateBody?: string | null;
  templateStorageKey?: string | null;
}) {
  const body = params.templateBody?.trim() || null;
  const storageKey = params.templateStorageKey?.trim() || null;

  if (params.contentFormat === 'HTML_HBS') {
    return {
      templateBody: body,
      templateStorageKey: null,
    };
  }

  return {
    templateBody: null,
    templateStorageKey: storageKey,
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

export const documentTemplate = tsr.router(contract.documentTemplate, {
  list: async ({ query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;
      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, DOCUMENT_TEMPLATE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.documentTemplates.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, DOCUMENT_TEMPLATE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db.select({ count: sql<number>`count(*)::int` }).from(documentTemplates).where(whereClause),
      ]);

      const totalCount = countResult[0]?.count ?? 0;
      return {
        status: 200 as const,
        body: {
          data,
          meta: buildPaginationMeta(totalCount, page, limit),
        },
      };
    } catch (error) {
      return genericTsRestErrorResponse(error, {
        genericMsg: 'Error al listar plantillas de firma',
      });
    }
  },

  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const template = await db.query.documentTemplates.findFirst({
        where: eq(documentTemplates.id, id),
        with: buildTypedIncludes(query?.include, DOCUMENT_TEMPLATE_INCLUDES),
      });

      if (!template) {
        throwHttpError({
          status: 404,
          message: 'Plantilla no encontrada',
          code: 'NOT_FOUND',
        });
      }

      return { status: 200 as const, body: template };
    } catch (error) {
      return genericTsRestErrorResponse(error, {
        genericMsg: `Error al obtener plantilla de firma ${id}`,
      });
    }
  },

  create: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const { templateSignerRules: signerRulesPayload, ...templatePayload } = body;
      const normalized = normalizeTemplateBody(templatePayload);

      const createdId = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(documentTemplates)
          .values({
            ...templatePayload,
            ...normalized,
          })
          .returning({ id: documentTemplates.id });

        if (signerRulesPayload.length > 0) {
          await tx.insert(templateSignerRules).values(
            signerRulesPayload.map((rule) => ({
              documentTemplateId: created.id,
              signerRole: rule.signerRole,
              signOrder: rule.signOrder,
              required: rule.required,
            }))
          );
        }

        return created.id;
      });

      const createdTemplate = await db.query.documentTemplates.findFirst({
        where: eq(documentTemplates.id, createdId),
        with: buildTypedIncludes(
          ['templateSignerRules', 'creditProductDocumentRules'],
          DOCUMENT_TEMPLATE_INCLUDES
        ),
      });

      if (!createdTemplate) {
        throwHttpError({
          status: 500,
          message: 'No fue posible cargar la plantilla creada',
          code: 'INTERNAL_ERROR',
        });
      }

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: createdTemplate.id.toString(),
        resourceLabel: `${createdTemplate.code} v${createdTemplate.version}`,
        status: 'success',
        afterValue: createdTemplate,
        ipAddress,
        userAgent,
      });

      return { status: 201 as const, body: createdTemplate };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return {
          status: 409 as const,
          body: {
            message: 'Ya existe una plantilla con ese codigo y version',
            code: 'CONFLICT',
          },
        };
      }

      const response = genericTsRestErrorResponse(error, {
        genericMsg: 'Error al crear plantilla de firma',
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        status: 'failure',
        errorMessage: response.body.message,
        metadata: { body },
        ipAddress,
        userAgent,
      });
      return response;
    }
  },

  update: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const existing = await db.query.documentTemplates.findFirst({
        where: eq(documentTemplates.id, id),
        with: buildTypedIncludes(
          ['templateSignerRules', 'creditProductDocumentRules'],
          DOCUMENT_TEMPLATE_INCLUDES
        ),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Plantilla con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      const { templateSignerRules: signerRulesPayload, ...templatePayload } = body;
      const normalized = normalizeTemplateBody(templatePayload);

      await db.transaction(async (tx) => {
        await tx
          .update(documentTemplates)
          .set({
            ...templatePayload,
            ...normalized,
          })
          .where(eq(documentTemplates.id, id));

        await tx.delete(templateSignerRules).where(eq(templateSignerRules.documentTemplateId, id));

        if (signerRulesPayload.length > 0) {
          await tx.insert(templateSignerRules).values(
            signerRulesPayload.map((rule) => ({
              documentTemplateId: id,
              signerRole: rule.signerRole,
              signOrder: rule.signOrder,
              required: rule.required,
            }))
          );
        }
      });

      const updated = await db.query.documentTemplates.findFirst({
        where: eq(documentTemplates.id, id),
        with: buildTypedIncludes(
          ['templateSignerRules', 'creditProductDocumentRules'],
          DOCUMENT_TEMPLATE_INCLUDES
        ),
      });

      if (!updated) {
        throwHttpError({
          status: 500,
          message: 'No fue posible cargar la plantilla actualizada',
          code: 'INTERNAL_ERROR',
        });
      }

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.code} v${existing.version}`,
        status: 'success',
        beforeValue: existing,
        afterValue: updated,
        ipAddress,
        userAgent,
      });

      return { status: 200 as const, body: updated };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return {
          status: 409 as const,
          body: {
            message: 'Ya existe una plantilla con ese codigo y version',
            code: 'CONFLICT',
          },
        };
      }

      const response = genericTsRestErrorResponse(error, {
        genericMsg: `Error al actualizar plantilla de firma ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: response.body.message,
        metadata: { body },
        ipAddress,
        userAgent,
      });
      return response;
    }
  },

  delete: async ({ params: { id } }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const existing = await db.query.documentTemplates.findFirst({
        where: eq(documentTemplates.id, id),
        with: buildTypedIncludes(
          ['templateSignerRules', 'creditProductDocumentRules'],
          DOCUMENT_TEMPLATE_INCLUDES
        ),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Plantilla con ID ${id} no encontrada`,
          code: 'NOT_FOUND',
        });
      }

      await db.delete(documentTemplates).where(eq(documentTemplates.id, id));

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id.toString(),
        resourceLabel: `${existing.code} v${existing.version}`,
        status: 'success',
        beforeValue: existing,
        ipAddress,
        userAgent,
      });

      return { status: 200 as const, body: existing };
    } catch (error) {
      const response = genericTsRestErrorResponse(error, {
        genericMsg: `Error al eliminar plantilla de firma ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: id.toString(),
        status: 'failure',
        errorMessage: response.body.message,
        ipAddress,
        userAgent,
      });
      return response;
    }
  },
});
