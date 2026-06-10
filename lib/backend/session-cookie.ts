const SESSION_VERSION = "v1";
const DEFAULT_SESSION_SECRET = "kira-finance-superai-demo-session-secret";

function sessionSecret() {
  return process.env.KIRA_SESSION_SECRET?.trim()
    || process.env.AUTH_SECRET?.trim()
    || DEFAULT_SESSION_SECRET;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

function timingSafeEqual(left: string, right: string) {
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}

export async function createSessionCookie(userId: string) {
  const payload = base64UrlEncode(new TextEncoder().encode(userId));
  const signedValue = `${SESSION_VERSION}.${payload}`;
  return `${signedValue}.${await sign(signedValue)}`;
}

export async function readSessionUserId(cookieValue: string | undefined) {
  if (!cookieValue) return null;
  const [version, payload, signature, ...extra] = cookieValue.split(".");
  if (extra.length || version !== SESSION_VERSION || !payload || !signature) return null;

  const signedValue = `${version}.${payload}`;
  const expected = await sign(signedValue);
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    return new TextDecoder().decode(base64UrlDecode(payload));
  } catch {
    return null;
  }
}
