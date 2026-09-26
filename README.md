# Jarvis Career

Gamified Python learning career sim. Missions, editor, freelance gigs, portfolio, and Google-account cloud saves.

## Environment variables (Vercel)

Set these in the Vercel project. No source edits required.

| Name | Required | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | yes | Google Cloud OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | yes | Google Cloud OAuth client secret |
| `BETTER_AUTH_SECRET` | yes | Long random string (32+ chars). Sessions will not survive a refresh without this |
| `BETTER_AUTH_URL` | yes | Public site origin, **no trailing slash**, must match the URL you open |
| `DATABASE_URL` | yes | Existing Neon/Postgres connection string |
| `VITE_AUTH_ENABLED` | yes | Must be `true` |

Optional: `BETTER_AUTH_TRUSTED_ORIGINS` — comma-separated extra origins.

Do **not** set `GROK_AUTH_ISSUER`, `GROK_AUTH_CLIENT_ID`, or `GROK_AUTH_CLIENT_SECRET`. Login uses Better Auth's native Google provider (`/api/auth/sign-in/social`), not `/api/auth/sign-in/oauth2`.

## Google OAuth callback

Exact callback URL to add in Google Cloud Console → APIs & Services → Credentials → your OAuth client → Authorized redirect URIs:

```
https://mobile-additional-python-1hurn9mvd-bhavishyacodzs-projects.vercel.app/api/auth/callback/google
```

Also add the same origin under Authorized JavaScript origins:

```
https://mobile-additional-python-1hurn9mvd-bhavishyacodzs-projects.vercel.app
```

If you use a different production domain, set `BETTER_AUTH_URL` to that origin and register:

```
{BETTER_AUTH_URL}/api/auth/callback/google
```

`BETTER_AUTH_URL` must be the origin you actually visit. A mismatch drops the session cookie and you land back on login.

## Sign-in flow

1. Open the site → login
2. Continue with Google (no sign-out, no oauth2 retry)
3. Pick a Gmail account
4. Google returns to `/api/auth/callback/google`
5. Better Auth writes the session cookie
6. New accounts go to onboarding (name + age) then the game
7. Returning accounts go straight into the game
8. Refresh keeps you logged in

Logout is only the Sign out control in Profile.

## Deploy to GitHub + Vercel

1. Extract this project and push **all files** to GitHub (including `migrations/`, `src/`, `scripts/`, `public/`, `server/`).
2. In Vercel: Import the GitHub repo.
3. Add the environment variables above.
4. Deploy. `npm run build` applies database migrations automatically.
5. Open the site → **Continue with Google**.

Existing Neon tables (including Better Auth `user` / `session` / `account` and `career_saves`) are kept. Migrations are additive.

## Local

```
npm install
npm run dev
```

Guest play works without Google credentials. Google login needs the same env vars as production.
