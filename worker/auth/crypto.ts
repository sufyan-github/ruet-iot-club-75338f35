const PASSWORD_ALGORITHM = "PBKDF2";
const PASSWORD_DIGEST = "SHA-256";
// Cloudflare Workers Web Crypto rejects PBKDF2 iteration counts above 100,000.
// Keep the work factor encoded in each hash so it can be raised through a
// rehash-on-login migration if the runtime ceiling changes.
const PASSWORD_ITERATIONS = 100_000;
const PASSWORD_HASH_BYTES = 32;
const SALT_BYTES = 16;
const TOKEN_BYTES = 32;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function equalBytes(left: Uint8Array, right: Uint8Array): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", left),
    crypto.subtle.digest("SHA-256", right),
  ]);
  return crypto.subtle.timingSafeEqual(leftHash, rightHash);
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), PASSWORD_ALGORITHM, false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: PASSWORD_ALGORITHM, hash: PASSWORD_DIGEST, salt, iterations },
    key,
    PASSWORD_HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, iterationText, saltText, hashText] = encoded.split("$");
  const iterations = Number(iterationText);
  if (
    scheme !== "pbkdf2_sha256" ||
    !Number.isSafeInteger(iterations) ||
    iterations < 100_000 ||
    !saltText ||
    !hashText
  ) {
    return false;
  }

  try {
    const expected = fromBase64Url(hashText);
    const actual = await derivePassword(password, fromBase64Url(saltText), iterations);
    return await equalBytes(actual, expected);
  } catch {
    return false;
  }
}

export function createOpaqueToken(): string {
  return toBase64Url(randomBytes(TOKEN_BYTES));
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toBase64Url(new Uint8Array(digest));
}

export async function deriveCsrfToken(secret: string, sessionId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`ruet-csrf:v1:${sessionId}`),
  );
  return toBase64Url(new Uint8Array(signature));
}

export async function timingSafeEqualStrings(left: string, right: string): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  return crypto.subtle.timingSafeEqual(leftHash, rightHash);
}

async function emailEncryptionKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest("SHA-256", encoder.encode(`ruet-email-outbox:v1:${secret}`));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptJson(value: unknown, secret: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode("ruet-email-outbox:v1") },
    await emailEncryptionKey(secret),
    encoder.encode(JSON.stringify(value)),
  );
  return { ciphertext: toBase64Url(new Uint8Array(encrypted)), iv: toBase64Url(iv) };
}

export async function decryptJson<T>(ciphertext: string, iv: string, secret: string): Promise<T> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(iv), additionalData: encoder.encode("ruet-email-outbox:v1") },
    await emailEncryptionKey(secret),
    fromBase64Url(ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

export const passwordHashPolicy = {
  algorithm: "PBKDF2-HMAC-SHA256",
  iterations: PASSWORD_ITERATIONS,
  saltBytes: SALT_BYTES,
  hashBytes: PASSWORD_HASH_BYTES,
} as const;
