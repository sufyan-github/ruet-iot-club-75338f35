const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

interface ApiFailureBody {
  success: false;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(body: ApiFailureBody, status: number) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; csrfToken?: string; submissionToken?: string; idempotencyKey?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) headers.set("Content-Type", "application/json");
  if (options.csrfToken) headers.set("X-CSRF-Token", options.csrfToken);
  if (options.submissionToken) headers.set("X-Submission-Token", options.submissionToken);
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    ...(options.body !== undefined ? { body: (isFormData ? options.body : JSON.stringify(options.body)) as BodyInit } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
  const payload = (await response.json()) as ApiSuccessBody<T> | ApiFailureBody;
  if (!response.ok || !payload.success) throw new ApiError(payload as ApiFailureBody, response.status);
  return payload.data;
}
