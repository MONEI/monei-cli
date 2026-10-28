import type { Credentials } from "./auth.js";

// Thin REST client for API-key mode. Reference: https://docs.monei.com/apis/rest/
// TODO: switch to the GraphQL API (operations marked @aws_oidc) once OAuth
// login lands, so CLI, MCP and dashboard share one permission model.

export const DEFAULT_BASE_URL = "https://api.monei.com/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

export type Fetch = typeof fetch;

export class MoneiClient {
  constructor(
    private readonly creds: Credentials,
    private readonly opts: { baseUrl?: string; fetch?: Fetch; userAgent?: string } = {},
  ) {}

  async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const f = this.opts.fetch ?? fetch;
    const res = await f(`${this.opts.baseUrl ?? DEFAULT_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: this.creds.apiKey,
        "Content-Type": "application/json",
        "User-Agent": this.opts.userAgent ?? "monei-cli",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const msg = (data as { message?: string } | undefined)?.message ?? res.statusText;
      throw new ApiError(`${res.status} ${msg}`, res.status, data);
    }
    return data as T;
  }

  getPayment(id: string) {
    return this.request("GET", `/payments/${encodeURIComponent(id)}`);
  }
  createPayment(input: Record<string, unknown>) {
    return this.request("POST", "/payments", input);
  }
  refundPayment(id: string, input: Record<string, unknown>) {
    return this.request("POST", `/payments/${encodeURIComponent(id)}/refund`, input);
  }
  cancelPayment(id: string, input: Record<string, unknown>) {
    return this.request("POST", `/payments/${encodeURIComponent(id)}/cancel`, input);
  }
}
