import { z } from 'zod';

// ============================================
// TOKEN ENDPOINT
// ============================================

export const M2MTokenRequestSchema = z.object({
  grant_type: z.literal('client_credentials'),
  client_id: z.string(),
  client_secret: z.string(),
  app_slug: z.string(),
});

export type M2MTokenRequest = z.infer<typeof M2MTokenRequestSchema>;

export const M2MTokenResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number(),
});

export type M2MTokenResponse = z.infer<typeof M2MTokenResponseSchema>;

// ============================================
// AUDIT LOG ENDPOINT
// ============================================

export const AuditActionSchema = z.enum([
  'create',
  'update',
  'delete',
  'read',
  'login',
  'logout',
  'other',
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditStatusSchema = z.enum(['success', 'failure']);

export type AuditStatus = z.infer<typeof AuditStatusSchema>;

export const ACTOR_TYPES = ['user', 'api_client'] as const;
export const ActorTypeEnum = z.enum(ACTOR_TYPES);

export const CreateAuditLogBodySchema = z.object({
  action: AuditActionSchema,
  actorType: ActorTypeEnum,
  resourceKey: z.string(),
  actionKey: z.string(),
  functionName: z.string(),
  resourceId: z.string().optional(),
  resourceLabel: z.string().optional(),
  userId: z.uuid().optional(),
  userName: z.string().optional(),
  ipAddress: z.string(),
  userAgent: z.string(),
  applicationId: z.string(),
  applicationName: z.string(),
  status: AuditStatusSchema,
  errorMessage: z.string().optional(),
  beforeValue: z.record(z.string(), z.unknown()).optional(),
  afterValue: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAuditLogBody = z.infer<typeof CreateAuditLogBodySchema>;

export const AuditLogSchema = z.object({
  id: z.uuid(),
  action: AuditActionSchema,
  resourceKey: z.string(),
  functionName: z.string(),
  resourceId: z.string().nullable(),
  resourceLabel: z.string().nullable(),
  userId: z.uuid().nullable(),
  userName: z.string().nullable(),
  ipAddress: z.string().nullable(),
  status: AuditStatusSchema,
  errorMessage: z.string().nullable(),
  beforeValue: z.record(z.string(), z.unknown()).nullable(),
  afterValue: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// ============================================
// USERS ENDPOINT
// ============================================

export const UserStatusSchema = z.enum(['active', 'suspended']);

export type UserStatus = z.infer<typeof UserStatusSchema>;

export const SafeUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable().optional(),
  status: UserStatusSchema,
  isAdmin: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string().nullable().optional(),
});

export type SafeUser = z.infer<typeof SafeUserSchema>;

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const PaginatedUsersResponseSchema = z.object({
  data: z.array(SafeUserSchema),
  meta: PaginationMetaSchema,
});

export type PaginatedUsersResponse = z.infer<typeof PaginatedUsersResponseSchema>;

// ============================================
// LIST USERS QUERY PARAMS
// ============================================

export type ListUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  include?: ('roles' | 'sessions' | 'auditLogs')[];
};

export type GetUserByIdParams = {
  include?: ('roles' | 'sessions' | 'auditLogs')[];
};

// ============================================
// ERROR
// ============================================

export class IamClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'IamClientError';
  }
}
