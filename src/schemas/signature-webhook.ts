import { z } from 'zod';
import { SIGNER_ROLE_OPTIONS } from './document-template';

export { SIGNER_ROLE_OPTIONS };

export const SIGNATURE_PROVIDER_OPTIONS = ['DOCUSIGN', 'YOUSIGN', 'ADOBE_SIGN', 'CUSTOM'] as const;

export const SIGNATURE_ENVELOPE_STATUS_OPTIONS = [
  'DRAFT',
  'SENT',
  'PARTIALLY_SIGNED',
  'SIGNED',
  'REJECTED',
  'EXPIRED',
  'CANCELED',
  'ERROR',
] as const;

export const SIGNATURE_SIGNER_STATUS_OPTIONS = [
  'PENDING',
  'SENT',
  'VIEWED',
  'SIGNED',
  'REJECTED',
  'EXPIRED',
  'CANCELED',
] as const;

export const SIGNATURE_ARTIFACT_TYPE_OPTIONS = [
  'SIGNED_PDF',
  'CERTIFICATE',
  'AUDIT_TRAIL',
  'TIMESTAMP_PROOF',
] as const;

const SignatureWebhookSignerInputSchema = z
  .object({
    providerSignerId: z.string().trim().min(1).max(180).optional(),
    signerRole: z.enum(SIGNER_ROLE_OPTIONS).optional(),
    status: z.enum(SIGNATURE_SIGNER_STATUS_OPTIONS).optional(),
    signedAt: z.coerce.date().optional(),
    rejectedReason: z.string().trim().max(5000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.providerSignerId && !value.signerRole) {
      ctx.addIssue({
        code: 'custom',
        message: 'Debe enviar providerSignerId o signerRole para identificar el firmante',
        path: ['providerSignerId'],
      });
    }
  });

const SignatureWebhookArtifactInputSchema = z.object({
  providerArtifactId: z.string().trim().min(1).max(180).optional(),
  artifactType: z.enum(SIGNATURE_ARTIFACT_TYPE_OPTIONS),
  loanDocumentInstanceId: z.number().int().positive().optional(),
  storageKey: z.string().trim().min(1),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().nonnegative().optional(),
  sha256: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/),
});

export const SignatureWebhookEventBodySchema = z.object({
  provider: z.enum(SIGNATURE_PROVIDER_OPTIONS).default('CUSTOM'),
  providerEnvelopeId: z.string().trim().min(1).max(180),
  providerEventId: z.string().trim().min(1).max(180).nullable().optional(),
  eventType: z.string().trim().min(1).max(120),
  eventAt: z.coerce.date().optional(),
  envelopeStatus: z.enum(SIGNATURE_ENVELOPE_STATUS_OPTIONS).optional(),
  webhookSignatureValid: z.boolean().optional(),
  errorMessage: z.string().trim().max(5000).nullable().optional(),
  payload: z.unknown().optional(),
  signers: z.array(SignatureWebhookSignerInputSchema).optional().default([]),
  artifacts: z.array(SignatureWebhookArtifactInputSchema).optional().default([]),
});

export const SignatureWebhookEventResponseSchema = z.object({
  received: z.literal(true),
  processed: z.boolean(),
  signatureEnvelopeId: z.number().int().positive().nullable(),
  message: z.string(),
});

export type SignatureWebhookEventBody = z.infer<typeof SignatureWebhookEventBodySchema>;

// ---------------------------------------------------------------------------
// Label maps for UI display
// ---------------------------------------------------------------------------

export const LOAN_DOCUMENT_STATUS_OPTIONS = [
  'GENERATED',
  'SENT_FOR_SIGNATURE',
  'PARTIALLY_SIGNED',
  'SIGNED',
  'REJECTED',
  'EXPIRED',
  'CANCELED',
  'VOID',
] as const;

export const loanDocumentStatusLabels: Record<(typeof LOAN_DOCUMENT_STATUS_OPTIONS)[number], string> = {
  GENERATED: 'Generado',
  SENT_FOR_SIGNATURE: 'Enviado a firma',
  PARTIALLY_SIGNED: 'Parcialmente firmado',
  SIGNED: 'Firmado',
  REJECTED: 'Rechazado',
  EXPIRED: 'Expirado',
  CANCELED: 'Cancelado',
  VOID: 'Anulado',
};

export const signatureEnvelopeStatusLabels: Record<
  (typeof SIGNATURE_ENVELOPE_STATUS_OPTIONS)[number],
  string
> = {
  DRAFT: 'Borrador',
  SENT: 'Enviado',
  PARTIALLY_SIGNED: 'Parcialmente firmado',
  SIGNED: 'Firmado',
  REJECTED: 'Rechazado',
  EXPIRED: 'Expirado',
  CANCELED: 'Cancelado',
  ERROR: 'Error',
};

export const signatureSignerStatusLabels: Record<
  (typeof SIGNATURE_SIGNER_STATUS_OPTIONS)[number],
  string
> = {
  PENDING: 'Pendiente',
  SENT: 'Enviado',
  VIEWED: 'Visto',
  SIGNED: 'Firmado',
  REJECTED: 'Rechazado',
  EXPIRED: 'Expirado',
  CANCELED: 'Cancelado',
};

export const signatureProviderLabels: Record<(typeof SIGNATURE_PROVIDER_OPTIONS)[number], string> = {
  DOCUSIGN: 'DocuSign',
  YOUSIGN: 'YouSign',
  ADOBE_SIGN: 'Adobe Sign',
  CUSTOM: 'Integracion custom',
};
