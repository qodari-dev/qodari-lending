import { env } from "@/env";
import { NextRequest, NextResponse } from "next/server";

export type IamProxyConfig = {
  iamBaseUrl: string;
  clientId: string;
  redirectUri: string;
  accessTokenCookieName: string;
  publicPaths?: string[];
};

const DEFAULT_PUBLIC_PATHS = ["/", "/health", "/oauth/callback"];

function isPublicPath(pathname: string, publicPaths: string[]): boolean {
  if (publicPaths.includes(pathname)) return true;

  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/public")) return true;

  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/.well-known")) return true;

  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|avif)$/i.test(pathname)) return true;
  if (/\.(css|js|map)$/i.test(pathname)) return true;
  if (/\.(woff2?|ttf|otf|eot)$/i.test(pathname)) return true;

  return false;
}

function randomString(length = 43): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  const array = crypto.getRandomValues(new Uint8Array(length));
  array.forEach((v) => {
    result += charset[v % charset.length];
  });
  return result;
}

async function sha256Base64Url(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuffer);

  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildAuthorizeUrl(params: {
  iamBaseUrl: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
}): string {
  const url = new URL("/oauth/authorize", params.iamBaseUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/**
 * Wrapper reutilizable para Next 16 proxy.ts
 * - Si la ruta es pública → deja pasar.
 * - Si hay access token en cookie → deja pasar.
 * - Si NO hay token → genera PKCE + state, guarda en cookies y redirige a IAM.
 */
export function createIamProxy(config: IamProxyConfig) {
  const publicPaths = config.publicPaths ?? DEFAULT_PUBLIC_PATHS;
  const secure = env.NODE_ENV === "production";

  return async function iamProxy(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // 1) Rutas públicas
    if (isPublicPath(pathname, publicPaths)) {
      return NextResponse.next();
    }

    // 2) Ya hay access token → pasa
    const accessToken = request.cookies.get(
      config.accessTokenCookieName,
    )?.value;
    if (accessToken) {
      return NextResponse.next();
    }

    // 3) No hay token → iniciar flujo OAuth
    const codeVerifier = randomString();
    const codeChallenge = await sha256Base64Url(codeVerifier);
    const state = randomString(16);

    const authorizeUrl = buildAuthorizeUrl({
      iamBaseUrl: config.iamBaseUrl,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      codeChallenge,
      state,
    });

    const response = NextResponse.redirect(authorizeUrl);

    response.cookies.set("pkce_verifier", codeVerifier, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("oauth_next", request.nextUrl.href, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
    });

    return response;
  };
}
