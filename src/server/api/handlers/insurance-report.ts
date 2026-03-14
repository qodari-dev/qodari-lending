import { db, insuranceCompanies, loans, thirdParties } from '@/server/db';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { getAuthContextAndValidatePermission } from '@/server/utils/require-permission';
import { formatDateOnly, toNumber } from '@/server/utils/value-utils';
import { getThirdPartyLabel } from '@/utils/third-party';
import { tsr } from '@ts-rest/serverless/next';
import { and, asc, between, eq, ne } from 'drizzle-orm';
import { contract } from '../contracts';

export const insuranceReport = tsr.router(contract.insuranceReport, {
  generate: async ({ body }, { request, appRoute }) => {
    try {
      await getAuthContextAndValidatePermission(request, appRoute.metadata);

      const insuranceCompany = await db.query.insuranceCompanies.findFirst({
        where: and(
          eq(insuranceCompanies.id, body.insuranceCompanyId),
          eq(insuranceCompanies.isActive, true)
        ),
        columns: {
          id: true,
          businessName: true,
        },
      });

      if (!insuranceCompany) {
        throwHttpError({
          status: 404,
          code: 'NOT_FOUND',
          message: 'Aseguradora no encontrada',
        });
      }

      const startDate = formatDateOnly(body.liquidatedCreditsStartDate);
      const endDate = formatDateOnly(body.liquidatedCreditsEndDate);

      const creditRows = await db
        .select({
          creditNumber: loans.creditNumber,
          liquidationDate: loans.creditStartDate,
          principalAmount: loans.principalAmount,
          insuredAmount: loans.insuranceValue,
          borrowerDocumentNumber: thirdParties.documentNumber,
          borrowerPersonType: thirdParties.personType,
          borrowerBusinessName: thirdParties.businessName,
          borrowerFirstName: thirdParties.firstName,
          borrowerSecondName: thirdParties.secondName,
          borrowerFirstLastName: thirdParties.firstLastName,
          borrowerSecondLastName: thirdParties.secondLastName,
          borrowerHomePhone: thirdParties.homePhone,
          borrowerMobilePhone: thirdParties.mobilePhone,
          borrowerEmail: thirdParties.email,
          borrowerHomeAddress: thirdParties.homeAddress,
          borrowerWorkAddress: thirdParties.workAddress,
        })
        .from(loans)
        .innerJoin(thirdParties, eq(loans.thirdPartyId, thirdParties.id))
        .where(
          and(
            eq(loans.insuranceCompanyId, body.insuranceCompanyId),
            between(loans.creditStartDate, startDate, endDate),
            ne(loans.status, 'VOID')
          )
        )
        .orderBy(asc(loans.creditStartDate), asc(loans.creditNumber));

      const rows = creditRows.map((row) => ({
        creditNumber: row.creditNumber,
        borrowerDocumentNumber: row.borrowerDocumentNumber,
        borrowerName: getThirdPartyLabel({
          personType: row.borrowerPersonType,
          businessName: row.borrowerBusinessName,
          firstName: row.borrowerFirstName,
          secondName: row.borrowerSecondName,
          firstLastName: row.borrowerFirstLastName,
          secondLastName: row.borrowerSecondLastName,
          documentNumber: row.borrowerDocumentNumber,
        }),
        borrowerPhone: row.borrowerMobilePhone ?? row.borrowerHomePhone ?? null,
        borrowerEmail: row.borrowerEmail ?? null,
        borrowerAddress: row.borrowerHomeAddress ?? row.borrowerWorkAddress ?? null,
        liquidationDate: row.liquidationDate,
        principalAmount: toNumber(row.principalAmount),
        insuredAmount: toNumber(row.insuredAmount),
      }));

      return {
        status: 200 as const,
        body: {
          insuranceCompanyId: insuranceCompany.id,
          insuranceCompanyName: insuranceCompany.businessName,
          liquidatedCreditsStartDate: startDate,
          liquidatedCreditsEndDate: endDate,
          reviewedCredits: rows.length,
          reportedCredits: rows.length,
          rows,
          message: rows.length
            ? 'Reporte para aseguradora generado correctamente.'
            : 'No se encontraron créditos para la aseguradora en el rango indicado.',
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al generar reporte para aseguradora',
      });
    }
  },
});
