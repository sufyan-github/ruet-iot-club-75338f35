export interface ApiMeta {
  requestId: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiFailure {
  success: false;
  code: string;
  message: string;
  meta: ApiMeta;
  details?: Record<string, string[]>;
}

export function success<T>(data: T, requestId: string): ApiSuccess<T> {
  return { success: true, data, meta: { requestId } };
}

export function failure(
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, string[]>,
): ApiFailure {
  return {
    success: false,
    code,
    message,
    meta: { requestId },
    ...(details ? { details } : {}),
  };
}
