import type { MoneiClient } from "./client.js";

// Every command is described as data, so the same definitions can drive:
//   - the commander CLI (src/index.ts)
//   - `monei llms` (full command list for LLMs)
//   - `--schema` (JSON Schema of a command's input)
//   - TODO: `monei mcp` (stdio MCP server exposing each command as a tool)

export type JsonSchema = {
  type: "object";
  properties: Record<string, { type: string; description: string; enum?: string[] }>;
  required?: string[];
};

export type CommandDef = {
  /** Space-separated path, e.g. "payments get". */
  name: string;
  description: string;
  /** Positional args, in order. Must also appear in `input.properties`. */
  args?: string[];
  input: JsonSchema;
  run: (client: MoneiClient, input: Record<string, unknown>) => Promise<unknown>;
};

const id = { type: "string", description: "Payment ID" };
const amount = { type: "integer", description: "Amount in the smallest currency unit (1050 = 10.50 EUR)" };

export const commands: CommandDef[] = [
  {
    name: "payments get",
    description: "Get a payment by ID",
    args: ["id"],
    input: { type: "object", properties: { id }, required: ["id"] },
    run: (c, i) => c.getPayment(String(i.id)),
  },
  {
    name: "payments create",
    description: "Create a payment and return its checkout URL",
    input: {
      type: "object",
      properties: {
        amount,
        currency: { type: "string", description: "ISO 4217 code, e.g. EUR" },
        orderId: { type: "string", description: "Your order reference" },
        description: { type: "string", description: "Shown to the customer" },
        customerEmail: { type: "string", description: "Customer email" },
        callbackUrl: { type: "string", description: "Webhook URL for this payment" },
        completeUrl: { type: "string", description: "Redirect after the customer completes" },
      },
      required: ["amount", "currency", "orderId"],
    },
    run: (c, i) => {
      const { customerEmail, ...rest } = i;
      return c.createPayment(customerEmail ? { ...rest, customer: { email: customerEmail } } : rest);
    },
  },
  {
    name: "payments refund",
    description: "Refund a payment, fully or partially",
    args: ["id"],
    input: {
      type: "object",
      properties: {
        id,
        amount: { ...amount, description: "Amount to refund; omit for the full amount" },
        refundReason: {
          type: "string",
          description: "Reason",
          enum: ["duplicated", "fraudulent", "requested_by_customer"],
        },
      },
      required: ["id"],
    },
    run: (c, { id: pid, ...rest }) => c.refundPayment(String(pid), rest),
  },
  {
    name: "payments cancel",
    description: "Cancel an authorized payment that has not been captured",
    args: ["id"],
    input: {
      type: "object",
      properties: {
        id,
        cancellationReason: {
          type: "string",
          description: "Reason",
          enum: ["duplicated", "fraudulent", "requested_by_customer"],
        },
      },
      required: ["id"],
    },
    run: (c, { id: pid, ...rest }) => c.cancelPayment(String(pid), rest),
  },
  // TODO(v1): payments list, payment-links create|list, kpis (chargesDateRangeKPI),
  // account. These need the GraphQL API; add them with OAuth login.
];

/** Plain-text listing of every command, for LLM context (`monei llms`). */
export function llmsText(): string {
  const lines = [
    "# monei CLI",
    "Operate a MONEI account from the terminal. Amounts are integers in cents.",
    "Global flags: --format json|jsonl|text, --test (use test key), --schema (print input JSON Schema)",
    "Auth: MONEI_API_KEY (or MONEI_TEST_API_KEY with --test).",
    "",
  ];
  for (const c of commands) {
    const req = new Set(c.input.required ?? []);
    const params = Object.entries(c.input.properties)
      .map(([k, v]) => {
        const flag = c.args?.includes(k) ? `<${k}>` : `--${toKebab(k)} <${v.type}>`;
        return req.has(k) ? flag : `[${flag}]`;
      })
      .join(" ");
    lines.push(`monei ${c.name} ${params}`.trim(), `  ${c.description}`);
  }
  return lines.join("\n");
}

export function toKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
