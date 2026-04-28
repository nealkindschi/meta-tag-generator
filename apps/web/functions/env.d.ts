interface Env {
  AI: {
    run(model: string, input: {
      messages: { role: string; content: string }[];
      response_format?: { type: string };
      max_tokens?: number;
    }): Promise<unknown>;
  };
  BROWSER: {
    newPage(): Promise<{
      goto(url: string, options?: { waitUntil: string }): Promise<void>;
      evaluate<T>(fn: () => T): Promise<T>;
      close(): Promise<void>;
    }>;
  };
  SEO_TOOLS_KV: {
    get(key: string, format?: "json"): Promise<unknown>;
    put(key: string, value: string, options?: { expirationTtl: number }): Promise<void>;
  };
  DB: D1Database;
}
