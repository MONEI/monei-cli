# monei-cli

TypeScript CLI (`monei`) to operate a MONEI account from the terminal. Primary users are AI
coding agents, then developers. Merchant-side only: no wallets, no card issuing.
Reference for patterns: https://github.com/stripe/link-cli (MIT).

## Layout

- `src/commands.ts` — every command as data (`CommandDef`: name, args, input JSON Schema, run).
  This single list drives the CLI, `monei llms`, `--schema` and (later) `monei mcp`.
  **Add a command here, nowhere else.**
- `src/index.ts` — commander wiring, global flags, error handling, exit codes.
- `src/client.ts` — HTTP client. REST + API key today; GraphQL + OAuth next.
- `src/auth.ts` — credential resolution.
- `src/output.ts` — text / json / jsonl rendering.

## Conventions

- Node 22+, ESM, strict TypeScript. Build with tsup, test with vitest. Keep dependencies minimal.
- Amounts are integers in cents. Timestamps are Unix seconds. Never format them away in json output.
- Output is for agents first: compact by default, no spinners or colours when not a TTY, honour `NO_COLOR`.
- Errors: JSON on stderr when not a TTY. Exit codes: 3 auth, 4 API, 1 other.
- Every command gets a test with a mocked `fetch`. No live calls in tests.
- Never print a full API key or token.

## Security limits (same as the MCP OAuth grants)

No payouts, no reusable payment tokens, no lasting callback URLs. IBANs, credentials and KYC
downloads are never exposed.

## Roadmap

v1
1. OAuth loopback `monei login` through the broker in `authorization-service`; register the
   CLI as a client (CIMD) and request the verified tier. Refresh token in `~/.config/monei/`
   (OS keychain when available); 15-minute access tokens refreshed transparently.
2. Move to the GraphQL API (operations marked `@aws_oidc`), matching the merchant MCP tools.
3. Commands: `payments list`, `payment-links create|list`, `kpis` (chargesDateRangeKPI), `account`.
   Global `--account-id`.
4. `monei mcp`: stdio MCP server built from `commands`.
5. Skill in MONEI/agent-skills, docs page on docs.monei.com, publish to npm and Homebrew.

v1.1: device-flow login (needs a device endpoint in authorization-service).

v2: approval flow for sensitive actions (refunds or payments above a limit wait for a human in
the dashboard, like Stripe's spend requests), disputes, `monei listen` for webhooks.

## Open

- npm name: unscoped `monei` (owned by Dima) or `@monei-js/cli`. `package.json` uses the latter for now.
- Whether to reuse `@monei-js/node-sdk` types for the REST client.
