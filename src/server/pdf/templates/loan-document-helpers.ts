import { Loans } from '@/server/db/types';

export function getBorrowerFullName(loan: Loans): string {
  const b = loan.borrower;
  if (!b) return '-';
  if (b.personType === 'LEGAL') return b.businessName ?? b.documentNumber;
  const name = [b.firstName, b.secondName, b.firstLastName, b.secondLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || b.documentNumber;
}

export function getBorrowerDocument(loan: Loans): string {
  return loan.borrower?.documentNumber ?? '-';
}

export function getBorrowerAddress(loan: Loans): string {
  return loan.borrower?.homeAddress ?? loan.borrower?.workAddress ?? '-';
}

export function getBorrowerPhone(loan: Loans): string {
  return loan.borrower?.mobilePhone ?? loan.borrower?.homePhone ?? loan.borrower?.workPhone ?? '-';
}

export function getBorrowerEmail(loan: Loans): string {
  return loan.borrower?.email ?? '-';
}

export function getAgreementName(loan: Loans): string {
  return loan.agreement?.businessName ?? '-';
}

export function getAgreementNit(loan: Loans): string {
  return loan.agreement?.documentNumber ?? '-';
}

export function getAgreementAddress(loan: Loans): string {
  return loan.agreement?.address ?? '-';
}

export function getCreditLineName(loan: Loans): string {
  const app = loan.loanApplication;
  if (!app) return '-';
  const product = app.creditProduct;
  return product ? product.name : '-';
}

export function getFinancingRate(loan: Loans): number {
  const factor = loan.loanApplication?.financingFactor;
  if (!factor) return 0;
  return typeof factor === 'string' ? Number(factor) : factor;
}

export function getFinancingRatePercent(loan: Loans): string {
  const rate = getFinancingRate(loan);
  return `${(rate * 100).toFixed(3)}%`;
}

export function getSalary(loan: Loans): string {
  return loan.loanApplication?.salary ?? '0';
}

export function getCategoryCode(loan: Loans): string {
  return loan.loanApplication?.categoryCode ?? '-';
}

export function getInstallmentTotalCuota(installment: {
  principalAmount: string;
  interestAmount: string;
  insuranceAmount: string;
}): number {
  return (
    Number(installment.principalAmount) +
    Number(installment.interestAmount) +
    Number(installment.insuranceAmount)
  );
}
