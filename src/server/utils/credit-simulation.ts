export type FinancingType = 'FIXED_AMOUNT' | 'ON_BALANCE';

export type CreditSimulationInput = {
  financingType: FinancingType;
  principal: number;
  annualRatePercent: number;
  installments: number;
  firstPaymentDate: Date;
  daysInterval: number;
  insuranceRatePercent?: number;
};

export type CreditSimulationInstallment = {
  installmentNumber: number;
  dueDate: string;
  days: number;
  openingBalance: number;
  principal: number;
  interest: number;
  insurance: number;
  payment: number;
  closingBalance: number;
};

export type CreditSimulationSummary = {
  principal: number;
  annualRatePercent: number;
  insuranceRatePercent: number;
  installments: number;
  daysInterval: number;
  totalPrincipal: number;
  totalInterest: number;
  totalInsurance: number;
  totalPayment: number;
  firstInstallmentPayment: number;
  maxInstallmentPayment: number;
  minInstallmentPayment: number;
};

export type CreditSimulationResult = {
  summary: CreditSimulationSummary;
  installments: CreditSimulationInstallment[];
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatISODate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function calculatePeriodRate(annualRatePercent: number, daysInterval: number): number {
  return (annualRatePercent / 100 / 360) * daysInterval;
}

function buildFixedInstallmentSchedule(
  principal: number,
  periodRate: number,
  installments: number
): { basePayment: number } {
  if (periodRate === 0) {
    return { basePayment: roundMoney(principal / installments) };
  }

  const annuity = (principal * periodRate) / (1 - Math.pow(1 + periodRate, -installments));
  return { basePayment: roundMoney(annuity) };
}

export function calculateCreditSimulation(input: CreditSimulationInput): CreditSimulationResult {
  const insuranceRatePercent = input.insuranceRatePercent ?? 0;

  const periodRate = calculatePeriodRate(input.annualRatePercent, input.daysInterval);

  let remaining = roundMoney(input.principal);
  const installments: CreditSimulationInstallment[] = [];

  const capitalPerInstallment = roundMoney(input.principal / input.installments);

  const basePaymentInfo = buildFixedInstallmentSchedule(
    input.principal,
    periodRate,
    input.installments
  );

  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalInsurance = 0;

  for (let index = 1; index <= input.installments; index++) {
    const openingBalance = remaining;

    const dueDate = addDays(input.firstPaymentDate, (index - 1) * input.daysInterval);

    const interest =
      input.financingType === 'FIXED_AMOUNT'
        ? roundMoney(input.principal * periodRate)
        : roundMoney(openingBalance * periodRate);

    let principalPayment =
      input.financingType === 'FIXED_AMOUNT'
        ? capitalPerInstallment
        : roundMoney(basePaymentInfo.basePayment - interest);

    if (index === input.installments) {
      principalPayment = roundMoney(openingBalance);
    } else if (principalPayment > openingBalance) {
      principalPayment = roundMoney(openingBalance);
    }

    const insurance = roundMoney(openingBalance * (insuranceRatePercent / 100));

    const payment = roundMoney(principalPayment + interest + insurance);

    const closingBalance = roundMoney(openingBalance - principalPayment);

    installments.push({
      installmentNumber: index,
      dueDate: formatISODate(dueDate),
      days: input.daysInterval,
      openingBalance,
      principal: principalPayment,
      interest,
      insurance,
      payment,
      closingBalance,
    });

    remaining = closingBalance;
    totalPrincipal += principalPayment;
    totalInterest += interest;
    totalInsurance += insurance;
  }

  totalPrincipal = roundMoney(totalPrincipal);
  totalInterest = roundMoney(totalInterest);
  totalInsurance = roundMoney(totalInsurance);

  const payments = installments.map((item) => item.payment);

  return {
    summary: {
      principal: roundMoney(input.principal),
      annualRatePercent: input.annualRatePercent,
      insuranceRatePercent,
      installments: input.installments,
      daysInterval: input.daysInterval,
      totalPrincipal,
      totalInterest,
      totalInsurance,
      totalPayment: roundMoney(totalPrincipal + totalInterest + totalInsurance),
      firstInstallmentPayment: payments[0] ?? 0,
      maxInstallmentPayment: payments.length ? Math.max(...payments) : 0,
      minInstallmentPayment: payments.length ? Math.min(...payments) : 0,
    },
    installments,
  };
}
