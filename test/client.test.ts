import { describe, expect, it, vi } from "vitest";
import { resolveCredentials } from "../src/auth.js";
import { ApiError, MoneiClient } from "../src/client.js";
import { commands, llmsText } from "../src/commands.js";

const creds = { kind: "api-key" as const, apiKey: "pk_test_123", test: true };

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe("auth", () => {
  it("detects test mode from the key prefix", () => {
    expect(resolveCredentials({}, { MONEI_API_KEY: "pk_test_x" }).test).toBe(true);
    expect(resolveCredentials({}, { MONEI_API_KEY: "pk_live_x" }).test).toBe(false);
  });

  it("prefers MONEI_TEST_API_KEY with --test", () => {
    const c = resolveCredentials({ test: true }, { MONEI_API_KEY: "pk_live_x", MONEI_TEST_API_KEY: "pk_test_y" });
    expect(c.apiKey).toBe("pk_test_y");
  });

  it("fails clearly without a key", () => {
    expect(() => resolveCredentials({}, {})).toThrow(/MONEI_API_KEY/);
  });
});

describe("client", () => {
  it("sends the API key in the Authorization header", async () => {
    const f = fakeFetch(200, { id: "pay_1" });
    await new MoneiClient(creds, { fetch: f }).getPayment("pay_1");
    expect(f).toHaveBeenCalledWith(
      "https://api.monei.com/v1/payments/pay_1",
      expect.objectContaining({ method: "GET", headers: expect.objectContaining({ Authorization: "pk_test_123" }) }),
    );
  });

  it("raises ApiError with the API message", async () => {
    const f = fakeFetch(404, { message: "Payment not found" });
    await expect(new MoneiClient(creds, { fetch: f }).getPayment("x")).rejects.toThrow(ApiError);
  });

  it("nests customerEmail under customer on create", async () => {
    const f = fakeFetch(200, {});
    const create = commands.find((c) => c.name === "payments create")!;
    await create.run(new MoneiClient(creds, { fetch: f }), {
      amount: 100,
      currency: "EUR",
      orderId: "o1",
      customerEmail: "a@b.c",
    });
    const body = JSON.parse((f as any).mock.calls[0][1].body);
    expect(body).toEqual({ amount: 100, currency: "EUR", orderId: "o1", customer: { email: "a@b.c" } });
  });
});

describe("llms", () => {
  it("lists every command", () => {
    const text = llmsText();
    for (const c of commands) expect(text).toContain(`monei ${c.name}`);
  });
});
