import { NextRequest, NextResponse } from "next/server";

export type IamCallbackConfig = {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessTokenCookieName: string;
  refreshTokenCookieName?: string;
  defaultRedirectPath?: string;
  refreshTokenMaxAgeSeconds?: number;
};

type AuthorizationCodeTokenRequest = {
  grant_type: "authorization_code";
  code: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
  code_verifier?: string;
};

type TokenEndpointResponse = {
  accessToken: string;
  refreshToken?: string;
  tokenType: "Bearer";
  expiresIn: number;
  scope?: string;
  idToken?: string;
};

export function createIamCallbackHandler(config: IamCallbackConfig) {
  const secure = process.env.NODE_ENV === "production";
  const defaultRedirect = config.defaultRedirectPath ?? "/";

  return async function iamCallbackHandler(
    req: NextRequest,
  ): Promise<NextResponse> {
    const url = req.nextUrl;
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return new NextResponse("Missing code", { status: 400 });
    }

    const cookies = req.cookies;
    const storedState = cookies.get("oauth_state")?.value;
    const verifier = cookies.get("pkce_verifier")?.value;
    const nextUrl = cookies.get("oauth_next")?.value ?? defaultRedirect;

    if (!storedState || state !== storedState) {
      return new NextResponse("Invalid state", { status: 400 });
    }

    const body: AuthorizationCodeTokenRequest = {
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...(verifier ? { code_verifier: verifier } : {}),
    };

    const tokenRes = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!tokenRes.ok) {
      let errorBody: unknown;
      try {
        errorBody = await tokenRes.json();
      } catch {
        errorBody = null;
      }
      console.error("[iam-callback] token error", errorBody);
      return new NextResponse("Failed to exchange code", { status: 500 });
    }

    const json = (await tokenRes.json()) as TokenEndpointResponse;

    const response = NextResponse.redirect(nextUrl);

    // Access token cookie
    response.cookies.set(config.accessTokenCookieName, json.accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: json.expiresIn,
    });

    // Refresh token cookie (si está configurado)
    if (config.refreshTokenCookieName && json.refreshToken) {
      response.cookies.set(config.refreshTokenCookieName, json.refreshToken, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: config.refreshTokenMaxAgeSeconds ?? 60 * 60 * 24 * 15,
      });
    }

    // Limpiar cookies temporales usadas en el proxy
    const clearOpts = {
      httpOnly: true,
      secure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    };
    response.cookies.set("pkce_verifier", "", clearOpts);
    response.cookies.set("oauth_state", "", clearOpts);
    response.cookies.set("oauth_next", "", clearOpts);

    return response;
  };
}
