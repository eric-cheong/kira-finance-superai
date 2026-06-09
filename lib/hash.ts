// Tiny deterministic hash for the immutable audit chain and stable pseudo-ids.
// Not cryptographic — in production this is a server-side SHA-256 HMAC. It exists
// here so the audit log demonstrably hash-chains without a runtime dependency.

export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // 8-hex unsigned
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** 16-hex chained hash: combines previous hash with the entry payload. */
export function chainHash(prevHash: string, payload: string): string {
  const a = fnv1a(prevHash + "|" + payload);
  const b = fnv1a(payload + "|" + a);
  return a + b;
}
