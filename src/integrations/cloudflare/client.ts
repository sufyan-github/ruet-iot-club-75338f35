import { apiRequest } from "@/lib/api";

type QueryResult<T = any> = { data: T | null; error: any; count?: number | null };
type Filter = { field: string; value: unknown; operator?: "eq" | "gte" | "in" };

let activeCsrfToken: string | null = null;

export function setCloudflareCsrfToken(token: string | null): void {
  activeCsrfToken = token;
}

class QueryBuilder implements PromiseLike<QueryResult> {
  private operation: "select" | "insert" | "update" | "delete" = "select";
  private filters: Filter[] = [];
  private orderBy?: { field: string; ascending: boolean };
  private rowLimit = 100;
  private wantsSingle = false;
  private countOnly = false;
  private values: any = null;

  constructor(private readonly table: string) {}

  select(_columns = "*", options?: { count?: string; head?: boolean }): this {
    if (this.operation === "select") {
      this.countOnly = options?.head === true;
    }
    return this;
  }

  insert(values: any): this {
    this.operation = "insert";
    this.values = values;
    return this;
  }

  update(values: any): this {
    this.operation = "update";
    this.values = values;
    return this;
  }

  delete(): this {
    this.operation = "delete";
    return this;
  }

  eq(field: string, value: unknown): this {
    this.filters.push({ field, value, operator: "eq" });
    return this;
  }

  gte(field: string, value: unknown): this {
    this.filters.push({ field, value, operator: "gte" });
    return this;
  }

  in(field: string, values: unknown[]): this {
    this.filters.push({ field, value: values, operator: "in" });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }): this {
    this.orderBy = { field, ascending: options?.ascending !== false };
    return this;
  }

  limit(limit: number): this {
    this.rowLimit = limit;
    return this;
  }

  single(): this {
    this.wantsSingle = true;
    this.rowLimit = 1;
    return this;
  }

  maybeSingle(): this {
    return this.single();
  }

  private async execute(): Promise<QueryResult> {
    try {
      if (this.operation === "select") {
        const result = await apiRequest<{ items: any[]; count: number }>("/data/query", {
          method: "POST",
          body: {
            table: this.table,
            filters: this.filters,
            order: this.orderBy,
            limit: this.rowLimit,
            single: this.wantsSingle,
            countOnly: this.countOnly,
          },
        });
        return {
          data: this.countOnly ? null : this.wantsSingle ? (result.items[0] ?? null) : result.items,
          error: null,
          count: result.count,
        };
      }
      if (this.operation === "insert") {
        const rows = Array.isArray(this.values) ? this.values : [this.values];
        const data = await apiRequest<{ items: any[] }>(`/data/submissions/${encodeURIComponent(this.table)}`, {
          method: "POST",
          csrfToken: activeCsrfToken ?? undefined,
          body: { rows },
        });
        return { data: this.wantsSingle ? (data.items[0] ?? null) : data.items, error: null };
      }
      if (this.operation === "update" && ["profiles", "course_registrations"].includes(this.table)) {
        const data = await apiRequest("/data/mutate", {
          method: "POST",
          csrfToken: activeCsrfToken ?? undefined,
          body: { table: this.table, values: this.values, filters: this.filters },
        });
        return { data, error: null };
      }
      return { data: null, error: new Error("This legacy mutation is not available in the Cloudflare data service.") };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error("Cloudflare data request failed.") };
    }
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class NoopChannel {
  on(..._args: any[]): this { return this; }
  subscribe(): this { return this; }
}

export const cloudflareData = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  async rpc(name: string, args: Record<string, unknown> = {}): Promise<QueryResult> {
    try {
      const data = await apiRequest("/data/rpc", { method: "POST", body: { name, args } });
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error("Cloudflare data function failed.") };
    }
  },
  channel(..._args: any[]) {
    return new NoopChannel();
  },
  removeChannel(..._args: any[]) {},
  functions: {
    async invoke(..._args: any[]) {
      return { data: null, error: null };
    },
  },
  storage: {
    from(..._args: any[]) {
      return {
        async upload(_path: string, file: File) {
          try {
            const form = new FormData();
            form.set("file", file);
            const data = await apiRequest<{ key: string; url: string }>("/media/upload", {
              method: "POST",
              csrfToken: activeCsrfToken ?? undefined,
              body: form,
            });
            return { data, error: null };
          } catch (error) {
            return { data: null, error: error instanceof Error ? error : new Error("Media upload failed.") };
          }
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: path.startsWith("/") ? path : `/api/v1/media/files/${path}` } };
        },
        async createSignedUrl(path: string) {
          return { data: { signedUrl: path.startsWith("/") ? path : `/api/v1/media/files/${path}` }, error: null };
        },
      };
    },
  },
};
