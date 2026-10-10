import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AppError extends Error {
  readonly code: string;
  readonly status: ContentfulStatusCode;
  readonly details?: Record<string, string[]>;

  constructor(options: {
    code: string;
    message: string;
    status: ContentfulStatusCode;
    details?: Record<string, string[]>;
  }) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}
