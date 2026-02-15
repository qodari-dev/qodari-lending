import { api } from '@/clients/api';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { toast } from 'sonner';

export function useGenerateCurrentPortfolioReport() {
  return api.portfolioReport.generateCurrentPortfolio.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useGenerateHistoricalPortfolioByPeriodReport() {
  return api.portfolioReport.generateHistoricalPortfolioByPeriod.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useGenerateCreditsForCollectionReport() {
  return api.portfolioReport.generateCreditsForCollection.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useGeneratePayrollPortfolioByAgreementReport() {
  return api.portfolioReport.generatePayrollPortfolioByAgreement.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useGeneratePortfolioByCreditTypeReport() {
  return api.portfolioReport.generatePortfolioByCreditType.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useGeneratePortfolioIndicatorsReport() {
  return api.portfolioReport.generatePortfolioIndicators.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useGenerateCreditBalanceCertificateReport() {
  return api.portfolioReport.generateCreditBalanceCertificate.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}

export function useGenerateThirdPartyBalanceCertificateReport() {
  return api.portfolioReport.generateThirdPartyBalanceCertificate.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });
}
