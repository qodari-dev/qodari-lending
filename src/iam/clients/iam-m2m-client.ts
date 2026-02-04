import { env } from '@/env';
import {
  CreateAuditLogBody,
  AuditLog,
  SafeUser,
  PaginatedUsersResponse,
  M2MTokenResponse,
  IamClientError,
  ListUsersParams,
  GetUserByIdParams,
} from './types';

// ============================================
// TOKEN CACHE
// ============================================

type CachedToken = {
  accessToken: string;
  expiresAt: number; // timestamp in ms
};

let tokenCache: CachedToken | null = null;

// Safety margin: refresh 60 seconds before expiration
const TOKEN_REFRESH_MARGIN_MS = 60 * 1000;

// ============================================
// IAM M2M CLIENT
// ============================================

class IamM2MClient {
  private baseUrl: string;
  private tokenUrl: string;
  private clientId: string;
  private clientSecret: string;
  private appSlug: string;

  constructor() {
    this.baseUrl = env.IAM_BASE_URL;
    this.tokenUrl = env.IAM_TOKEN_URL;
    this.clientId = env.IAM_M2M_CLIENT_ID;
    this.clientSecret = env.IAM_M2M_CLIENT_SECRET;
    this.appSlug = env.IAM_SLUG;
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  private isTokenValid(): boolean {
    if (!tokenCache) return false;
    return Date.now() < tokenCache.expiresAt - TOKEN_REFRESH_MARGIN_MS;
  }

  private async fetchNewToken(): Promise<string> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        app_slug: this.appSlug,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      console.error('[IamM2MClient] Token fetch failed:', errorBody);
      throw new IamClientError('Failed to obtain M2M token', response.status, 'TOKEN_FETCH_FAILED');
    }

    const data = (await response.json()) as M2MTokenResponse;

    // Save to cache
    tokenCache = {
      accessToken: data.accessToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
    };

    return data.accessToken;
  }

  async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      return tokenCache!.accessToken;
    }
    return this.fetchNewToken();
  }

  // ============================================
  // HTTP HELPERS
  // ============================================

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string | number | boolean | string[] | undefined>;
    }
  ): Promise<T> {
    const token = await this.getAccessToken();

    let url = `${this.baseUrl}${path}`;

    // Add query params if they exist
    if (options?.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v));
          } else {
            params.append(key, String(value));
          }
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new IamClientError(
        errorBody?.message ?? `IAM request failed: ${response.status}`,
        response.status,
        errorBody?.code,
        errorBody?.details
      );
    }

    return response.json() as Promise<T>;
  }

  // ============================================
  // AUDIT LOGS
  // ============================================

  /**
   * Create an audit log in IAM (fire-and-forget, does not throw errors)
   */
  async createAuditLog(data: CreateAuditLogBody): Promise<AuditLog | null> {
    try {
      return await this.request<AuditLog>('POST', '/api/v1/audit', {
        body: data,
      });
    } catch (error) {
      // Log error but don't propagate - audit should not block operations
      console.error('[IamM2MClient] Failed to create audit log:', error);
      return null;
    }
  }

  // ============================================
  // USERS
  // ============================================

  /**
   * List users with pagination and filters
   */
  async listUsers(params?: ListUsersParams): Promise<PaginatedUsersResponse> {
    return this.request<PaginatedUsersResponse>('GET', '/api/v1/users', {
      query: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        include: params?.include,
      },
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string, params?: GetUserByIdParams): Promise<SafeUser> {
    return this.request<SafeUser>('GET', `/api/v1/users/${id}`, {
      query: {
        include: params?.include,
      },
    });
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const iamClient = new IamM2MClient();
