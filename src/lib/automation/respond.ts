import { NextResponse } from "next/server";
import { resolveApiKey } from "./auth";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

// Central wrapper: resolves the Bearer key (401 if missing/revoked), catches
// exceptions, always returns JSON. Never let a raw stack trace leak.
export async function withApiAuth(
  request: Request,
  handler: (userId: string) => Promise<unknown>,
) {
  try {
    const resolved = await resolveApiKey(request);
    if (!resolved) return jsonError(401, "Invalid or missing API key");
    const body = await handler(resolved.userId);
    return NextResponse.json(body);
  } catch (err) {
    console.error("automation api error:", err);
    return jsonError(500, "Internal error");
  }
}
