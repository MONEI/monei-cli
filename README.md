# monei CLI

MONEI from the terminal, for developers and AI agents (Claude Code, Codex, Cursor).

> **Status: early skeleton.** API-key mode with `payments get|create|refund|cancel`.
> OAuth login, the rest of the v1 commands and MCP mode are on the way.
> Tracking: MONEI Core Engineering Trello card #6740.

## Why

Coding agents work from the terminal. When a developer asks an agent to integrate payments,
the agent reaches for a CLI. `monei` gives agents (and humans) a fast, scriptable,
low-token way to operate a MONEI account, next to the MONEI MCP server and agent skills.

## Install

```sh
npx @monei-js/cli --help   # package name not final
```

## Auth

```sh
export MONEI_API_KEY=pk_test_...       # the key decides live or test mode
monei whoami
```

`--test` uses `MONEI_TEST_API_KEY` when set. `monei login` (OAuth, same consent and
"Connected apps" revocation as the MONEI MCP server) is coming.

## Usage

```sh
monei payments create --amount 1050 --currency EUR --order-id 1234 --description "Order 1234"
monei payments get pay_123
monei payments refund pay_123 --amount 500 --refund-reason requested_by_customer
monei payments cancel pay_123
```

Amounts are integers in the smallest currency unit (1050 = 10.50 EUR).

### Built for agents

| Feature | What it does |
| --- | --- |
| Compact output | `key: value` lines, empty fields dropped, few tokens |
| `--format json\|jsonl\|text` | Machine-readable output for pipes and scripts |
| `--schema` | Prints a command's input as JSON Schema |
| `monei llms` | Every command in one compact listing for LLM context |
| Errors | JSON on stderr when not a TTY; exit 3 auth, 4 API, 1 other |
| `monei mcp` | *(coming)* the same commands as a stdio MCP server |

## Develop

```sh
npm install
npm run build && node dist/index.js --help
npm test
```

See `CLAUDE.md` for conventions and the roadmap.

## License

MIT
