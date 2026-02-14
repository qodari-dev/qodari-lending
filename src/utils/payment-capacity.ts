import { roundMoney, toSafeNumber, type NumericInput } from './number-utils';

export function calculatePaymentCapacity(args: { income: NumericInput; expenses: NumericInput }): number {
  const income = toSafeNumber(args.income);
  const expenses = toSafeNumber(args.expenses);
  return roundMoney((income - expenses) / 2);
}

export function calculateLoanApplicationPaymentCapacity(args: {
  salary: NumericInput;
  otherIncome: NumericInput;
  otherCredits: NumericInput;
}): number {
  const income = toSafeNumber(args.salary) + toSafeNumber(args.otherIncome);
  const expenses = toSafeNumber(args.otherCredits);
  return calculatePaymentCapacity({ income, expenses });
}

export type PaymentCapacityAssessment = {
  paymentCapacity: number;
  installmentPayment: number;
  canPay: boolean;
  margin: number;
  shortfall: number;
};

export function assessPaymentCapacity(args: {
  paymentCapacity: NumericInput;
  installmentPayment: NumericInput;
}): PaymentCapacityAssessment {
  const paymentCapacity = roundMoney(toSafeNumber(args.paymentCapacity));
  const installmentPayment = roundMoney(toSafeNumber(args.installmentPayment));
  const margin = roundMoney(paymentCapacity - installmentPayment);

  return {
    paymentCapacity,
    installmentPayment,
    canPay: margin >= 0,
    margin,
    shortfall: margin < 0 ? roundMoney(Math.abs(margin)) : 0,
  };
}
