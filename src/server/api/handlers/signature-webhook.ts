import {
  db,
  loanDocumentInstances,
  signatureArtifacts,
  signatureEnvelopeDocuments,
  signatureEnvelopes,
  signatureEvents,
  signatureSigners,
} from '@/server/db';
import { SignatureWebhookEventBody } from '@/schemas/signature-webhook';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, inArray, not } from 'drizzle-orm';
import { contract } from '../contracts';

type EnvelopeStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PARTIALLY_SIGNED'
  | 'SIGNED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELED'
  | 'ERROR';

type LoanDocumentStatus =
  | 'GENERATED'
  | 'SENT_FOR_SIGNATURE'
  | 'PARTIALLY_SIGNED'
  | 'SIGNED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELED'
  | 'VOID';

function inferEnvelopeStatus(body: SignatureWebhookEventBody): EnvelopeStatus | null {
  if (body.envelopeStatus) return body.envelopeStatus;

  const eventType = body.eventType.trim().toUpperCase();

  if (eventType.includes('PARTIAL')) return 'PARTIALLY_SIGNED';
  if (eventType.includes('COMPLETE') || eventType.includes('SIGNED')) return 'SIGNED';
  if (eventType.includes('REJECT') || eventType.includes('DECLIN')) return 'REJECTED';
  if (eventType.includes('EXPIRE')) return 'EXPIRED';
  if (eventType.includes('CANCEL') || eventType.includes('VOID')) return 'CANCELED';
  if (eventType.includes('ERROR') || eventType.includes('FAIL')) return 'ERROR';
  if (eventType.includes('SENT') || eventType.includes('CREATE')) return 'SENT';

  return null;
}

function mapEnvelopeStatusToDocumentStatus(status: EnvelopeStatus): LoanDocumentStatus | null {
  switch (status) {
    case 'SENT':
      return 'SENT_FOR_SIGNATURE';
    case 'PARTIALLY_SIGNED':
      return 'PARTIALLY_SIGNED';
    case 'SIGNED':
      return 'SIGNED';
    case 'REJECTED':
      return 'REJECTED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'CANCELED':
      return 'CANCELED';
    default:
      return null;
  }
}

function normalizePayload(body: SignatureWebhookEventBody): unknown {
  if (body.payload !== undefined) return body.payload;

  return {
    provider: body.provider,
    providerEnvelopeId: body.providerEnvelopeId,
    providerEventId: body.providerEventId ?? null,
    eventType: body.eventType,
    eventAt: body.eventAt ? body.eventAt.toISOString() : null,
    envelopeStatus: body.envelopeStatus ?? null,
    webhookSignatureValid: body.webhookSignatureValid ?? null,
    errorMessage: body.errorMessage ?? null,
    signers: body.signers,
    artifacts: body.artifacts,
  };
}

export const signatureWebhook = tsr.router(contract.signatureWebhook, {
  event: async ({ body }) => {
    try {
      // TODO(signature-webhook-security): validar firma/hmac del proveedor según headers.
      const eventAt = body.eventAt ?? new Date();

      if (body.providerEventId) {
        const existingEvent = await db.query.signatureEvents.findFirst({
          where: and(
            eq(signatureEvents.provider, body.provider),
            eq(signatureEvents.providerEventId, body.providerEventId)
          ),
          columns: {
            id: true,
            signatureEnvelopeId: true,
            processed: true,
          },
        });

        if (existingEvent) {
          return {
            status: 200 as const,
            body: {
              received: true as const,
              processed: existingEvent.processed,
              signatureEnvelopeId: existingEvent.signatureEnvelopeId ?? null,
              message: 'Evento duplicado; ya habia sido recibido',
            },
          };
        }
      }

      const envelope = await db.query.signatureEnvelopes.findFirst({
        where: and(
          eq(signatureEnvelopes.provider, body.provider),
          eq(signatureEnvelopes.providerEnvelopeId, body.providerEnvelopeId)
        ),
        columns: {
          id: true,
          status: true,
        },
      });

      const inferredEnvelopeStatus = inferEnvelopeStatus(body);

      const result = await db.transaction(async (tx) => {
        const [createdEvent] = await tx
          .insert(signatureEvents)
          .values({
            signatureEnvelopeId: envelope?.id ?? null,
            provider: body.provider,
            providerEventId: body.providerEventId ?? null,
            eventType: body.eventType,
            eventAt,
            payload: normalizePayload(body),
            webhookSignatureValid: body.webhookSignatureValid,
            processed: false,
          })
          .returning({
            id: signatureEvents.id,
          });

        if (!envelope) {
          await tx
            .update(signatureEvents)
            .set({
              processed: true,
              processedAt: new Date(),
              processingError: `No existe sobre para providerEnvelopeId ${body.providerEnvelopeId}`,
            })
            .where(eq(signatureEvents.id, createdEvent.id));

          return {
            processed: false,
            signatureEnvelopeId: null,
            message: 'Webhook recibido, pero no existe sobre asociado',
          };
        }

        if (inferredEnvelopeStatus) {
          await tx
            .update(signatureEnvelopes)
            .set({
              status: inferredEnvelopeStatus,
              sentAt:
                inferredEnvelopeStatus === 'SENT' || inferredEnvelopeStatus === 'PARTIALLY_SIGNED'
                  ? eventAt
                  : undefined,
              completedAt: inferredEnvelopeStatus === 'SIGNED' ? eventAt : undefined,
              canceledAt: inferredEnvelopeStatus === 'CANCELED' ? eventAt : undefined,
              expiredAt: inferredEnvelopeStatus === 'EXPIRED' ? eventAt : undefined,
              errorMessage:
                inferredEnvelopeStatus === 'ERROR' ? (body.errorMessage ?? body.eventType) : null,
            })
            .where(eq(signatureEnvelopes.id, envelope.id));
        }

        for (const signer of body.signers) {
          const existingSigner = signer.providerSignerId
            ? await tx.query.signatureSigners.findFirst({
                where: and(
                  eq(signatureSigners.signatureEnvelopeId, envelope.id),
                  eq(signatureSigners.providerSignerId, signer.providerSignerId)
                ),
                columns: { id: true },
              })
            : signer.signerRole
              ? await tx.query.signatureSigners.findFirst({
                  where: and(
                    eq(signatureSigners.signatureEnvelopeId, envelope.id),
                    eq(signatureSigners.signerRole, signer.signerRole)
                  ),
                  columns: { id: true },
                })
              : null;

          if (!existingSigner) continue;

          await tx
            .update(signatureSigners)
            .set({
              providerSignerId: signer.providerSignerId ?? undefined,
              status: signer.status,
              signedAt: signer.signedAt,
              rejectedReason: signer.rejectedReason,
            })
            .where(eq(signatureSigners.id, existingSigner.id));
        }

        if (body.artifacts.length) {
          for (const artifact of body.artifacts) {
            await tx
              .insert(signatureArtifacts)
              .values({
                signatureEnvelopeId: envelope.id,
                loanDocumentInstanceId: artifact.loanDocumentInstanceId ?? null,
                provider: body.provider,
                providerArtifactId: artifact.providerArtifactId ?? null,
                artifactType: artifact.artifactType,
                storageKey: artifact.storageKey,
                mimeType: artifact.mimeType,
                sizeBytes: artifact.sizeBytes ?? null,
                sha256: artifact.sha256,
              })
              .onConflictDoNothing({
                target: [
                  signatureArtifacts.signatureEnvelopeId,
                  signatureArtifacts.artifactType,
                  signatureArtifacts.storageKey,
                ],
              });

            if (artifact.artifactType === 'SIGNED_PDF' && artifact.loanDocumentInstanceId) {
              await tx
                .update(loanDocumentInstances)
                .set({
                  status: 'SIGNED',
                  signedStorageKey: artifact.storageKey,
                  signedSha256: artifact.sha256,
                  signedAt: eventAt,
                })
                .where(eq(loanDocumentInstances.id, artifact.loanDocumentInstanceId));
            }
          }
        }

        if (inferredEnvelopeStatus) {
          const relatedDocs = await tx.query.signatureEnvelopeDocuments.findMany({
            where: eq(signatureEnvelopeDocuments.signatureEnvelopeId, envelope.id),
            columns: {
              loanDocumentInstanceId: true,
            },
          });

          const documentIds = relatedDocs.map((doc) => doc.loanDocumentInstanceId);
          const targetDocumentStatus = mapEnvelopeStatusToDocumentStatus(inferredEnvelopeStatus);

          if (documentIds.length && targetDocumentStatus) {
            // When propagating an envelope-level status that is NOT SIGNED,
            // skip documents already individually marked as SIGNED by artifact
            // processing above to prevent overwriting them.
            const skipAlreadySigned = targetDocumentStatus !== 'SIGNED';
            const whereClause = skipAlreadySigned
              ? and(
                  inArray(loanDocumentInstances.id, documentIds),
                  not(eq(loanDocumentInstances.status, 'SIGNED'))
                )
              : inArray(loanDocumentInstances.id, documentIds);

            await tx
              .update(loanDocumentInstances)
              .set({
                status: targetDocumentStatus,
                sentForSignatureAt:
                  targetDocumentStatus === 'SENT_FOR_SIGNATURE' ||
                  targetDocumentStatus === 'PARTIALLY_SIGNED'
                    ? eventAt
                    : undefined,
                signedAt: targetDocumentStatus === 'SIGNED' ? eventAt : undefined,
              })
              .where(whereClause);
          }
        }

        await tx
          .update(signatureEvents)
          .set({
            processed: true,
            processedAt: new Date(),
            processingError: null,
          })
          .where(eq(signatureEvents.id, createdEvent.id));

        return {
          processed: true,
          signatureEnvelopeId: envelope.id,
          message: 'Webhook procesado correctamente',
        };
      });

      return {
        status: 200 as const,
        body: {
          received: true as const,
          processed: result.processed,
          signatureEnvelopeId: result.signatureEnvelopeId,
          message: result.message,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al procesar webhook de firma digital',
      });
    }
  },
});
