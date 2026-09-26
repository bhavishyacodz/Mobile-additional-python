/**
 * Sign-in providers offered by this app.
 *
 * Production Google login is Better Auth's native social provider (`google`).
 * Do not add genericOAuth / grok-google entries here — those hit
 * POST /api/auth/sign-in/oauth2 and are the old broken loop.
 */
export type GrokProvider = {
  providerId: string;
  idp: string;
  label: string;
};

export const GROK_PROVIDERS: readonly GrokProvider[] = [
  { providerId: "google", idp: "google", label: "Google" },
];
