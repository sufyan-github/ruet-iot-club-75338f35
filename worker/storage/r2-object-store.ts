import { AppError } from "../lib/app-error";

const SAFE_SEGMENT = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SAFE_EXTENSION = /^[a-z0-9]{1,10}$/;

export type ObjectVisibility = "public" | "private";

export function createObjectKey(options: {
  visibility: ObjectVisibility;
  purpose: string;
  originalFilename: string;
  now?: Date;
}): string {
  const purpose = options.purpose.trim().toLowerCase();
  if (!SAFE_SEGMENT.test(purpose)) {
    throw new AppError({
      code: "INVALID_STORAGE_PURPOSE",
      message: "The upload purpose is invalid.",
      status: 400,
    });
  }

  const filenameParts = options.originalFilename.toLowerCase().split(".");
  const candidateExtension = filenameParts.length > 1 ? filenameParts.at(-1) : undefined;
  const extension = candidateExtension && SAFE_EXTENSION.test(candidateExtension) ? `.${candidateExtension}` : "";
  const date = options.now ?? new Date();
  const year = date.getUTCFullYear().toString();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");

  return `${options.visibility}/${purpose}/${year}/${month}/${crypto.randomUUID()}${extension}`;
}

export class R2ObjectStore {
  constructor(private readonly bucket: R2Bucket) {}

  async put(options: {
    key: string;
    body: ReadableStream | ArrayBuffer | ArrayBufferView;
    contentType: string;
    customMetadata?: Record<string, string>;
  }): Promise<R2Object> {
    const stored = await this.bucket.put(options.key, options.body, {
      httpMetadata: { contentType: options.contentType },
      customMetadata: options.customMetadata,
    });

    if (!stored) {
      throw new AppError({
        code: "STORAGE_WRITE_FAILED",
        message: "The file could not be stored.",
        status: 502,
      });
    }

    return stored;
  }

  get(key: string): Promise<R2ObjectBody | null> {
    return this.bucket.get(key);
  }

  delete(key: string): Promise<void> {
    return this.bucket.delete(key);
  }
}
