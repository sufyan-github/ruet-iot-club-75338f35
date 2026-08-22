import type { Context } from "hono";
import { AppError } from "../lib/app-error";
import type { AppEnvironment } from "../types";
import { sha256 } from "../auth/crypto";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/u;
const IDEMPOTENCY_HOURS = 24;

interface StoredCommandRow {
  request_hash: string;
  state: "IN_PROGRESS" | "COMPLETED";
  response_status: number | null;
  response_body_json: string | null;
}

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface IdempotentCommandResult {
  data: Record<string, JsonValue>;
  status: number;
  replayed: boolean;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") return Object.values(value).every(isJsonValue);
  return false;
}

function parseStoredData(value: string): Record<string, JsonValue> {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Stored idempotent response is invalid.");
  }
  const result: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(parsed)) {
    if (!isJsonValue(item)) {
      throw new Error("Stored idempotent response contains an unsupported value.");
    }
    result[key] = item;
  }
  return result;
}

export function requireIdempotencyKey(context: Context<AppEnvironment>): string {
  const key = context.req.header("Idempotency-Key")?.trim() ?? "";
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new AppError({
      code: "IDEMPOTENCY_KEY_REQUIRED",
      message: "Provide an Idempotency-Key containing 8 to 128 safe characters.",
      status: 400,
    });
  }
  return key;
}

async function commandHashes(options: {
  operation: string;
  idempotencyKey: string;
  requestData: Record<string, unknown>;
}): Promise<{ keyHash: string; requestHash: string }> {
  const [keyHash, requestHash] = await Promise.all([
    sha256(options.idempotencyKey),
    sha256(`${options.operation}:${JSON.stringify(options.requestData)}`),
  ]);
  return { keyHash, requestHash };
}

async function findStoredCommand(options: {
  db: D1Database;
  operation: string;
  actorKey: string;
  keyHash: string;
}): Promise<StoredCommandRow | null> {
  return options.db
    .prepare(
      `SELECT request_hash, state, response_status, response_body_json
       FROM command_idempotency
       WHERE operation = ? AND actor_key = ? AND key_hash = ? AND expires_at > ?`,
    )
    .bind(options.operation, options.actorKey, options.keyHash, new Date().toISOString())
    .first<StoredCommandRow>();
}

function resolveStoredCommand(row: StoredCommandRow, requestHash: string): IdempotentCommandResult {
  if (row.request_hash !== requestHash) {
    throw new AppError({
      code: "IDEMPOTENCY_CONFLICT",
      message: "This idempotency key was already used for a different request.",
      status: 409,
    });
  }
  if (row.state !== "COMPLETED" || row.response_status === null || row.response_body_json === null) {
    throw new AppError({
      code: "COMMAND_IN_PROGRESS",
      message: "A command with this idempotency key is still in progress.",
      status: 409,
    });
  }
  return { data: parseStoredData(row.response_body_json), status: row.response_status, replayed: true };
}

export async function getIdempotentReplay(options: {
  db: D1Database;
  operation: string;
  actorKey: string;
  idempotencyKey: string;
  requestData: Record<string, unknown>;
}): Promise<IdempotentCommandResult | null> {
  const { keyHash, requestHash } = await commandHashes(options);
  const existing = await findStoredCommand({
    db: options.db,
    operation: options.operation,
    actorKey: options.actorKey,
    keyHash,
  });
  return existing ? resolveStoredCommand(existing, requestHash) : null;
}

export async function executeIdempotentCommand(options: {
  db: D1Database;
  operation: string;
  actorKey: string;
  idempotencyKey: string;
  requestData: Record<string, unknown>;
  responseData: Record<string, JsonValue>;
  responseStatus: number;
  statements: D1PreparedStatement[];
}): Promise<IdempotentCommandResult> {
  const { keyHash, requestHash } = await commandHashes(options);
  const existing = await findStoredCommand({
    db: options.db,
    operation: options.operation,
    actorKey: options.actorKey,
    keyHash,
  });
  if (existing) return resolveStoredCommand(existing, requestHash);

  const commandId = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_HOURS * 60 * 60 * 1000).toISOString();
  const reservation = options.db
    .prepare(
      `INSERT INTO command_idempotency
        (id, operation, actor_key, key_hash, request_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(commandId, options.operation, options.actorKey, keyHash, requestHash, expiresAt);
  const completion = options.db
    .prepare(
      `UPDATE command_idempotency
       SET state = 'COMPLETED', response_status = ?, response_body_json = ?, completed_at = ?
       WHERE id = ? AND state = 'IN_PROGRESS'`,
    )
    .bind(options.responseStatus, JSON.stringify(options.responseData), now, commandId);

  try {
    await options.db.batch([reservation, ...options.statements, completion]);
  } catch (error) {
    const raced = await findStoredCommand({
      db: options.db,
      operation: options.operation,
      actorKey: options.actorKey,
      keyHash,
    });
    if (raced) return resolveStoredCommand(raced, requestHash);
    throw error;
  }
  return { data: options.responseData, status: options.responseStatus, replayed: false };
}
