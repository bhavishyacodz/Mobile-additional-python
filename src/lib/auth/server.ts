/**
 * Self-hosted Better Auth for THIS app (server-only).
 *
 * Native Google OAuth via Better Auth `socialProviders.google`.
 * Does NOT use the Grok OAuth broker (`genericOAuth` / GROK_AUTH_*).
 *
 * Required production env:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_SECRET,
 *   BETTER_AUTH_URL, DATABASE_URL, VITE_AUTH_ENABLED=true
 *
 * Google callback:
 *   {BETTER_AUTH_URL}/api/auth/callback/google
 */
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { GATE_PROVIDER_ID, gateIdentitySessions } from "./gate-session.server";
import { pgliteDialect } from "./pglite-dialect";
import { PREVIEW_ALLOWED_HOSTS } from "./preview";

void ensureDbReady();

const globalAuthRef = globalThis as typeof globalThis & {
  __grokAuthPreviewSecret__?: string;
};
function previewAuthSecret(): string {
  globalAuthRef.__grokAuthPreviewSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__grokAuthPreviewSecret__;
}

/** Read an env var, treating empty/whitespace as unset. */
const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

function withHttps(hostOrUrl: string): string {
  if (hostOrUrl.startsWith("http://") || hostOrUrl.startsWith("https://")) {
    return hostOrUrl.replace(/\/$/, "");
  }
  return `https://${hostOrUrl.replace(/\/$/, "")}`;
}

const authDisabled = env("VITE_AUTH_ENABLED") === "false";

const googleClientId = env("GOOGLE_CLIENT_ID");
const googleClientSecret = env("GOOGLE_CLIENT_SECRET");

export const googleOAuthConfigured = Boolean(googleClientId && googleClientSecret);
export const authSecretConfigured = Boolean(env("BETTER_AUTH_SECRET"));

/** True when real auth is enforced (Google social and/or gate identity). */
export const authConfigured = !authDisabled;

const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

const vercelOrigin = env("VERCEL_PROJECT_PRODUCTION_URL")
  ? withHttps(env("VERCEL_PROJECT_PRODUCTION_URL")!)
  : env("VERCEL_URL")
    ? withHttps(env("VERCEL_URL")!)
    : undefined;

const explicitBaseURL = env("BETTER_AUTH_URL") ? withHttps(env("BETTER_AUTH_URL")!) : undefined;

const previewAllowedHosts: string[] = [...PREVIEW_ALLOWED_HOSTS];
const isProduction = process.env.NODE_ENV === "production" || Boolean(env("VERCEL"));

if (isProduction && !authDisabled && !explicitBaseURL) {
  throw new Error(
    "BETTER_AUTH_URL is required when authentication is enabled in production. " +
      "Set it to the exact public origin of this deployment (for example https://your-domain.com).",
  );
}

if (isProduction && authDisabled) {
  throw new Error(
    "VITE_AUTH_ENABLED must not be false in production. Enable authentication before deploying the production app.",
  );
}

if (isProduction && !env("DATABASE_URL")) {
  throw new Error(
    "DATABASE_URL is required in production. Refusing to use the embedded PGLite fallback for a deployed app.",
  );
}

if (isProduction && !authDisabled && !env("BETTER_AUTH_SECRET")) {
  throw new Error(
    "BETTER_AUTH_SECRET is required when authentication is enabled in production. " +
      "Set a long random secret in the Vercel environment.",
  );
}

if (isProduction && !authDisabled && (!googleClientId || !googleClientSecret)) {
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in production when Google sign-in is enabled.",
  );
}

/**
 * Production always uses the explicit BETTER_AUTH_URL so Google's redirect URI
 * is deterministic. Local development may still derive an origin from the
 * request/known local hosts. We intentionally do not fall back to an old Vercel
 * deployment URL.
 */
const baseURL = explicitBaseURL ?? (isProduction
  ? undefined
  : vercelOrigin ?? {
      allowedHosts: [
        ...previewAllowedHosts,
        "localhost",
        "127.0.0.1",
        "[::1]",
        "*.vercel.app",
      ],
      protocol: "auto" as const,
      fallback: "http://localhost:8080",
    });

const STATIC_TRUSTED_ORIGINS: string[] = [
  ...LOCAL_DEV_ORIGINS,
  ...(explicitBaseURL ? [explicitBaseURL] : []),
  ...(vercelOrigin ? [vercelOrigin] : []),
  "https://*.vercel.app",
  "https://*.grok-sandbox.com",
  "http://*.grok-sandbox.com",
  ...previewAllowedHosts.flatMap((host) => [`https://${host}`, `http://${host}`]),
];

for (const extra of (env("BETTER_AUTH_TRUSTED_ORIGINS") ?? "").split(",")) {
  const origin = extra.trim();
  if (origin) STATIC_TRUSTED_ORIGINS.push(origin);
}

async function trustedOrigins(request?: Request): Promise<string[]> {
  const origins = new Set(STATIC_TRUSTED_ORIGINS);
  if (request) {
    try {
      origins.add(new URL(request.url).origin);
    } catch {
      /* ignore malformed */
    }
    const forwarded = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
      .split(",")[0]
      ?.trim();
    if (forwarded) {
      const proto =
        request.headers.get("x-forwarded-proto") ??
        (forwarded.startsWith("localhost") || forwarded.startsWith("127.0.0.1") ? "http" : "https");
      origins.add(`${proto}://${forwarded}`);
    }
    const originHeader = request.headers.get("origin");
    if (originHeader && originHeader !== "null") origins.add(originHeader);
  }
  return [...origins].filter(Boolean);
}

const databaseUrl = env("DATABASE_URL");

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

/**
 * Better Auth owns the session cookie. Do not add a second custom cookie layer;
 * `tanstackStartCookies()` is the single integration responsible for forwarding
 * Better Auth's Set-Cookie headers through TanStack Start.
 */
export const auth = betterAuth({
  baseURL,
  secret: env("BETTER_AUTH_SECRET") ?? previewAuthSecret(),
  database,
  basePath: "/api/auth",

  ...(googleOAuthConfigured
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId as string,
            clientSecret: googleClientSecret as string,
            prompt: "select_account",
            accessType: "online",
          },
        },
      }
    : {}),

  trustedOrigins,

  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", GATE_PROVIDER_ID],
      requireLocalEmailVerified: false,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },

  rateLimit: {
    window: 60,
    max: 120,
  },

  ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),

  advanced: {
    useSecureCookies: true,
  },

  onAPIError: {
    errorURL: "/login",
  },

  plugins: [gateIdentitySessions(), bearer(), tanstackStartCookies()],
});

export const SESSION_TOKEN_COOKIE = "better-auth.session_token";

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

export { GROK_PROVIDERS } from "./providers";
