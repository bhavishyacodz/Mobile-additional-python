import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

async function handleAuth({ request }: { request: Request }): Promise<Response> {
  const response = await auth.handler(request);
  console.info(
    `[auth] ${request.method} ${new URL(request.url).pathname} status=${response.status} set-cookie=${
      typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie().length : 0
    }`,
  );
  return response;
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handleAuth,
      POST: handleAuth,
    },
  },
});
