// Agent-first output.
// - TTY: readable text.  - Not a TTY (agents, pipes): compact text by default.
// - --format json|jsonl|text overrides. NO_COLOR is respected.

export type Format = "json" | "jsonl" | "text";

export function resolveFormat(flag: string | undefined, isTTY: boolean): Format {
  if (flag === "json" || flag === "jsonl" || flag === "text") return flag;
  if (flag) throw new Error(`Unknown format "${flag}". Use json, jsonl or text.`);
  void isTTY; // text is the default either way; toText() adapts spacing to the TTY
  return "text";
}

export function render(data: unknown, format: Format, isTTY: boolean): string {
  if (format === "json") return JSON.stringify(data, null, isTTY ? 2 : 0);
  if (format === "jsonl") {
    const rows = Array.isArray(data) ? data : [data];
    return rows.map((r) => JSON.stringify(r)).join("\n");
  }
  return toText(data, isTTY);
}

// Compact `key: value` lines; nested objects flattened with dots.
// Keeps token count low for LLMs while staying readable for humans.
function toText(data: unknown, isTTY: boolean): string {
  if (Array.isArray(data)) return data.map((d) => toText(d, isTTY)).join(isTTY ? "\n\n" : "\n---\n");
  if (data === null || typeof data !== "object") return String(data ?? "");
  const lines: string[] = [];
  const walk = (obj: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined || v === "") continue;
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "object" && !Array.isArray(v)) walk(v as Record<string, unknown>, key);
      else lines.push(`${key}: ${Array.isArray(v) ? JSON.stringify(v) : v}`);
    }
  };
  walk(data as Record<string, unknown>, "");
  return lines.join("\n");
}
