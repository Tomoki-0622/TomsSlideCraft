import { cookies } from "next/headers";

const SESSION_COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getSecretKey(): string {
  return process.env.SESSION_SECRET ?? "fallback-secret";
}

async function getPasswordHash(): Promise<string> {
  return sha256Hex(process.env.SITE_PASSWORD ?? "");
}

export async function generateSessionToken(): Promise<string> {
  const id = crypto.randomUUID();
  const passwordHash = await getPasswordHash();
  const payload = `${id}:${passwordHash}`;
  const sig = await hmacSha256Hex(getSecretKey(), payload);
  return `${sig}.${btoa(payload)}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const [sig, encodedPayload] = token.split(".");
    if (!sig || !encodedPayload) return false;
    const payload = atob(encodedPayload);
    const [, storedPasswordHash] = payload.split(":");
    const currentPasswordHash = await getPasswordHash();
    if (storedPasswordHash !== currentPasswordHash) return false;
    const expectedSig = await hmacSha256Hex(getSecretKey(), payload);
    return sig === expectedSig;
  } catch {
    return false;
  }
}

export function checkPassword(input: string): boolean {
  return input === (process.env.SITE_PASSWORD ?? "");
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
