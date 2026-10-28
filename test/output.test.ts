import { describe, expect, it } from "vitest";
import { render, resolveFormat } from "../src/output.js";

describe("output", () => {
  const payment = { id: "pay_1", amount: 1050, customer: { email: "a@b.c" }, empty: null };

  it("renders compact text with flattened keys and no empty values", () => {
    expect(render(payment, "text", false)).toBe("id: pay_1\namount: 1050\ncustomer.email: a@b.c");
  });

  it("renders single-line json when not a TTY", () => {
    expect(render(payment, "json", false)).toBe(JSON.stringify(payment));
  });

  it("renders one json object per line for jsonl", () => {
    expect(render([{ a: 1 }, { a: 2 }], "jsonl", false)).toBe('{"a":1}\n{"a":2}');
  });

  it("rejects unknown formats", () => {
    expect(() => resolveFormat("yaml", false)).toThrow(/Unknown format/);
  });
});
