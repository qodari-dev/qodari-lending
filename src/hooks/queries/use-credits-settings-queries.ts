import { api } from '@/clients/api';
import type { CreditsSettingsInclude } from '@/schemas/credits-settings';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';

export const creditsSettingsKeys = {
  all: ['credits-settings'] as const,
  detail: () => [...creditsSettingsKeys.all, 'detail'] as const,
};

export function useCreditsSettings(options?: {
  include?: CreditsSettingsInclude[];
  enabled?: boolean;
}) {
  return api.creditsSettings.get.useQuery({
    queryKey: creditsSettingsKeys.detail(),
    queryData: {
      query: {
        include: options?.include ?? [],
      },
    },
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateCreditsSettings() {
  const queryClient = api.useQueryClient();

  return api.creditsSettings.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditsSettingsKeys.all });
    },
    onError: (error) => {
      throw new Error(getTsRestErrorMessage(error));
    },
  });
}
