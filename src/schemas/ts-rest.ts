import { z } from 'zod';

export const TsRestErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type TsRestError = z.infer<typeof TsRestErrorSchema>;

export type TsRestMetaData =
  | { auth: 'public' }
  | {
      auth: 'required';
      permissionKey?: {
        resourceKey: string;
        actionKey: string;
      };
    };
