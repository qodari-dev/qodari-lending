import { env } from '@/env';
import {
  db,
  loanDocumentInstances,
  signatureEnvelopeDocuments,
  signatureEnvelopes,
  signatureEvents,
  signatureSigners,
} from '@/server/db';
import { and, eq, inArray, lt, not } from 'drizzle-orm';
import { subDays } from 'date-fns';

/**
 * Expires signature envelopes that have been in SENT or PARTIALLY_SIGNED
 * status for longer than the configured expiry period.
 *
 * This prevents envelopes from remaining in a pending state indefinitely
 * when signers never complete the signing process.
 *
 * Configurable via:
 * - SIGNATURE_ENVELOPE_EXPIRY_DAYS: number of days before expiry (default: 30)
 */
export async function expireStaleSignatureEnvelopes(): Promise<{ expiredCount: number }> {
  const expiryDays = env.SIGNATURE_ENVELOPE_EXPIRY_DAYS;
  const cutoffDate = subDays(new Date(), expiryDays);
  const now = new Date();

  // Find envelopes that have been SENT or PARTIALLY_SIGNED for too long
  const staleEnvelopes = await db.query.signatureEnvelopes.findMany({
    where: and(
      inArray(signatureEnvelopes.status, ['SENT', 'PARTIALLY_SIGNED']),
      lt(signatureEnvelopes.sentAt, cutoffDate)
    ),
    columns: {
      id: true,
      loanId: true,
      provider: true,
      providerEnvelopeId: true,
      status: true,
    },
  });

  if (!staleEnvelopes.length) {
    return { expiredCount: 0 };
  }

  for (const envelope of staleEnvelopes) {
    await db.transaction(async (tx) => {
      // Mark envelope as EXPIRED
      await tx
        .update(signatureEnvelopes)
        .set({
          status: 'EXPIRED',
          expiredAt: now,
        })
        .where(eq(signatureEnvelopes.id, envelope.id));

      // Mark pending/sent signers as EXPIRED
      await tx
        .update(signatureSigners)
        .set({
          status: 'EXPIRED',
        })
        .where(
          and(
            eq(signatureSigners.signatureEnvelopeId, envelope.id),
            inArray(signatureSigners.status, ['PENDING', 'SENT', 'VIEWED'])
          )
        );

      // Propagate EXPIRED to document instances (skip already SIGNED ones)
      const relatedDocs = await tx.query.signatureEnvelopeDocuments.findMany({
        where: eq(signatureEnvelopeDocuments.signatureEnvelopeId, envelope.id),
        columns: { loanDocumentInstanceId: true },
      });
      const docIds = relatedDocs.map((d) => d.loanDocumentInstanceId);

      if (docIds.length) {
        await tx
          .update(loanDocumentInstances)
          .set({ status: 'EXPIRED' })
          .where(
            and(
              inArray(loanDocumentInstances.id, docIds),
              not(eq(loanDocumentInstances.status, 'SIGNED'))
            )
          );
      }

      // Record expiry event
      await tx.insert(signatureEvents).values({
        signatureEnvelopeId: envelope.id,
        provider: envelope.provider,
        providerEventId: null,
        eventType: 'ENVELOPE_EXPIRED_BY_SYSTEM',
        eventAt: now,
        payload: {
          system: true,
          reason: `Sobre expirado automaticamente despues de ${expiryDays} dias sin completar firma`,
          previousStatus: envelope.status,
          loanId: envelope.loanId,
        },
        webhookSignatureValid: null,
        processed: true,
        processedAt: now,
        triggeredByUserId: null,
        triggeredByUserName: 'SYSTEM_CRON',
      });
    });
  }

  return { expiredCount: staleEnvelopes.length };
}
