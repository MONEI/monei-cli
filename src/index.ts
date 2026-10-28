import { Command } from "commander";
import { AuthError, resolveCredentials } from "./auth.js";
import { ApiError, MoneiClient } from "./client.js";
import { commands, llmsText, toKebab, type CommandDef } from "./commands.js";
import { render, resolveFormat } from "./output.js";

const VERSION = "0.0.1";
const isTTY = Boolean(process.stdout.isTTY);

const program = new Command()
  .name("monei")
  .description("MONEI from the terminal, for developers and AI agents")
  .version(VERSION)
  .option("--format <format>", "output format: json | jsonl | text")
  .option("--test", "use test mode (MONEI_TEST_API_KEY)");

function emit(data: unknown) {
  const format = resolveFormat(program.opts().format, isTTY);
  process.stdout.write(render(data, format, isTTY) + "\n");
}

function fail(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (program.opts().format === "json" || !isTTY) {
    const body = err instanceof ApiError ? err.body : undefined;
    process.stderr.write(JSON.stringify({ error: msg, status: (err as ApiError).status, body }) + "\n");
  } else {
    process.stderr.write(`Error: ${msg}\n`);
  }
  process.exit(err instanceof AuthError ? 3 : err instanceof ApiError ? 4 : 1);
}

function register(def: CommandDef) {
  const [group, leaf] = def.name.split(" ");
  const parent =
    program.commands.find((c) => c.name() === group) ?? program.command(group).description(`${group} commands`);
  const cmd = parent.command(leaf).description(def.description);

  for (const a of def.args ?? []) cmd.argument(`[${a}]`, def.input.properties[a].description);
  for (const [key, prop] of Object.entries(def.input.properties)) {
    if (def.args?.includes(key)) continue;
    cmd.option(`--${toKebab(key)} <${prop.type}>`, prop.description + (prop.enum ? ` (${prop.enum.join("|")})` : ""));
  }
  cmd.option("--schema", "print this command's input JSON Schema and exit");

  cmd.action(async (...params: unknown[]) => {
    const opts = cmd.opts();
    if (opts.schema) return emit(def.input);

    const input: Record<string, unknown> = {};
    (def.args ?? []).forEach((a, i) => {
      if (params[i] !== undefined) input[a] = params[i];
    });
    for (const [key, prop] of Object.entries(def.input.properties)) {
      const v = opts[key];
      if (v === undefined || def.args?.includes(key)) continue;
      if (prop.type === "integer") {
        if (!/^\d+$/.test(v)) fail(new Error(`--${toKebab(key)} must be an integer (cents), got "${v}"`));
        input[key] = Number.parseInt(v, 10);
      } else if (prop.enum && !prop.enum.includes(v)) {
        fail(new Error(`--${toKebab(key)} must be one of ${prop.enum.join(", ")}`));
      } else {
        input[key] = v;
      }
    }
    const missing = (def.input.required ?? []).filter((k) => input[k] === undefined);
    if (missing.length) fail(new Error(`Missing: ${missing.map((m) => (def.args?.includes(m) ? m : `--${toKebab(m)}`)).join(", ")}`));

    try {
      const client = new MoneiClient(resolveCredentials({ test: program.opts().test }), {
        userAgent: `monei-cli/${VERSION}`,
      });
      emit(await def.run(client, input));
    } catch (err) {
      fail(err);
    }
  });
}

commands.forEach(register);

program
  .command("llms")
  .description("print every command in a compact form for LLM context")
  .action(() => {
    process.stdout.write(llmsText() + "\n");
  });

program
  .command("whoami")
  .description("show which credentials and mode the CLI is using")
  .action(() => {
    try {
      const c = resolveCredentials({ test: program.opts().test });
      emit({ auth: c.kind, mode: c.test ? "test" : "live", key: `${c.apiKey.slice(0, 8)}…` });
    } catch (err) {
      fail(err);
    }
  });

program
  .command("login")
  .description("sign in with your MONEI account (OAuth) — coming soon")
  .action(() => fail(new Error("Not implemented yet. Use MONEI_API_KEY for now.")));

program
  .command("mcp")
  .description("run as a stdio MCP server exposing every command as a tool — coming soon")
  .action(() => fail(new Error("Not implemented yet.")));

program.parseAsync().catch(fail);
