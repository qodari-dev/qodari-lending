import {
  ExecuteLoanWriteOffBodySchema,
  GenerateLoanWriteOffProposalBodySchema,
  LoanWriteOffProposalRow,
  ReviewLoanWriteOffProposalBodySchema,
} from '@/schemas/loan-write-off';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { roundMoney } from '@/server/utils/value-utils';
import { tsr } from '@ts-rest/serverless/next';
import { format } from 'date-fns';
import { z } from 'zod';
import { contract } from '../contracts';

type GenerateLoanWriteOffProposalBody = z.infer<typeof GenerateLoanWriteOffProposalBodySchema>;
type ReviewLoanWriteOffProposalBody = z.infer<typeof ReviewLoanWriteOffProposalBodySchema>;
type ExecuteLoanWriteOffBody = z.infer<typeof ExecuteLoanWriteOffBodySchema>;

type PermissionRequest = Parameters<typeof getAuthContextAndValidatePermission>[0];
type PermissionMetadata = Parameters<typeof getAuthContextAndValidatePermission>[1];

type HandlerContext = {
  request: PermissionRequest;
  appRoute: { metadata: PermissionMetadata };
};

function toDateOnly(value: Date) {
  return format(value, 'yyyy-MM-dd');
}

function proposalSeed(proposalId: string) {
  return proposalId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function buildProposalId(cutoffDate: Date) {
  return `WO-${toDateOnly(cutoffDate).replace(/-/g, '')}`;
}

function buildMockRows(proposalId: string): LoanWriteOffProposalRow[] {
  const seed = proposalSeed(proposalId);
  const totalRows = 8 + (seed % 5);

  return Array.from({ length: totalRows }).map((_, index) => {
    const sequence = index + 1;
    const outstandingBalance = 1_300_000 + sequence * 275_000;
    const provisionAmount = roundMoney(outstandingBalance * 0.72);
    const recommendedWriteOffAmount = roundMoney(outstandingBalance - provisionAmount);

    return {
      creditNumber: `CRWO${String(seed).slice(-3)}${String(sequence).padStart(4, '0')}`,
      thirdPartyName: `Tercero cartera ${sequence}`,
      daysPastDue: 180 + sequence * 12,
      outstandingBalance,
      provisionAmount,
      recommendedWriteOffAmount,
    };
  });
}

function summarizeRows(rows: LoanWriteOffProposalRow[]) {
  const totalOutstandingBalance = roundMoney(
    rows.reduce((acc, row) => acc + row.outstandingBalance, 0)
  );
  const totalRecommendedWriteOff = roundMoney(
    rows.reduce((acc, row) => acc + row.recommendedWriteOffAmount, 0)
  );

  return {
    reviewedCredits: rows.length + 5,
    eligibleCredits: rows.length,
    totalOutstandingBalance,
    totalRecommendedWriteOff,
  };
}

async function generateProposal(body: GenerateLoanWriteOffProposalBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const proposalId = buildProposalId(body.cutoffDate);
    const rows = buildMockRows(proposalId);
    const summary = summarizeRows(rows);

    // TODO(loan-write-off-generate): implementar generacion real de propuesta de castigo:
    // - evaluar reglas de elegibilidad (dias mora, estado juridico, provision, politicas vigentes)
    // - consolidar universo revisado y creditos candidatos
    // - persistir propuesta para trazabilidad y aprobacion
    return {
      status: 200 as const,
      body: {
        proposalId,
        cutoffDate: toDateOnly(body.cutoffDate),
        ...summary,
        message: 'Propuesta de castiga cartera generada (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al generar propuesta de castiga cartera',
    });
  }
}

async function reviewProposal(body: ReviewLoanWriteOffProposalBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const proposalId = body.proposalId.trim().toUpperCase();
    const rows = buildMockRows(proposalId);
    const summary = summarizeRows(rows);

    // TODO(loan-write-off-review): implementar consulta real de la propuesta:
    // - leer propuesta persistida y su detalle de creditos candidatos
    // - recalcular/validar saldos y provisiones antes de ejecutar
    // - marcar novedades e inconsistencias para aprobacion final
    return {
      status: 200 as const,
      body: {
        proposalId,
        ...summary,
        rows,
        message: 'Revision de propuesta cargada (demo).',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al revisar propuesta de castiga cartera',
    });
  }
}

async function execute(body: ExecuteLoanWriteOffBody, context: HandlerContext) {
  const { request, appRoute } = context;

  try {
    await getAuthContextAndValidatePermission(request, appRoute.metadata);

    const proposalId = body.proposalId.trim().toUpperCase();
    const rows = buildMockRows(proposalId);
    const totalWrittenOffAmount = roundMoney(
      rows.reduce((acc, row) => acc + row.recommendedWriteOffAmount, 0)
    );

    // TODO(loan-write-off-execute): implementar ejecucion real del castigo:
    // - ejecutar castigo en transaccion (estado credito + movimientos + contabilidad)
    // - bloquear doble ejecucion del mismo lote
    // - registrar usuario, fecha y resultado por credito
    return {
      status: 200 as const,
      body: {
        proposalId,
        executedCredits: rows.length,
        totalWrittenOffAmount,
        movementDate: toDateOnly(new Date()),
        message: 'Ejecucion de castiga cartera recibida. Pendiente implementacion.',
      },
    };
  } catch (e) {
    return genericTsRestErrorResponse(e, {
      genericMsg: 'Error al ejecutar castiga cartera',
    });
  }
}

export const loanWriteOff = tsr.router(contract.loanWriteOff, {
  generateProposal: ({ body }, context) => generateProposal(body, context),
  reviewProposal: ({ body }, context) => reviewProposal(body, context),
  execute: ({ body }, context) => execute(body, context),
});
