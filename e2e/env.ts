import fs from "node:fs";
import path from "node:path";

type EnvRecord = Record<string, string>;

export function loadEnvFiles(fileNames = [".env", ".env.playwright"]) {
  const cwd = process.cwd();
  const candidates = new Set<string>();
  for (const fileName of fileNames) {
    candidates.add(path.resolve(cwd, fileName)); // current working dir
    candidates.add(path.resolve(cwd, "..", fileName)); // repo root when run from e2e/
  }

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const contents = fs.readFileSync(filePath, "utf8");
    const parsed = parseEnvContents(contents, filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

export function parseEnvContents(contents: string, sourceLabel: string) {
  const result: EnvRecord = {};
  const lines = contents.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index] ?? "";
    const entry = parseEnvLine(line, sourceLabel, lineNumber);
    if (!entry) continue;
    const [key, value] = entry;
    result[key] = value;
  }
  return result;
}

function parseEnvLine(
  rawLine: string,
  sourceLabel: string,
  lineNumber: number
): [string, string] | null {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const withoutExport = trimmed.startsWith("export ")
    ? trimmed.slice("export ".length).trimStart()
    : trimmed;

  const equalsIndex = withoutExport.indexOf("=");
  invariant(
    equalsIndex > 0,
    `${sourceLabel}:${lineNumber} must be KEY=VALUE`
  );

  const rawKey = withoutExport.slice(0, equalsIndex).trim();
  invariant(
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(rawKey),
    `${sourceLabel}:${lineNumber} key must be a valid identifier`
  );

  const rawValue = withoutExport.slice(equalsIndex + 1).trim();
  const parsedValue = parseEnvValue(rawValue, sourceLabel, lineNumber);
  return [rawKey, parsedValue];
}

function parseEnvValue(
  rawValue: string,
  sourceLabel: string,
  lineNumber: number
) {
  if (!rawValue) {
    return "";
  }

  const quote = rawValue[0];
  if (quote === '"' || quote === "'") {
    invariant(
      rawValue.endsWith(quote),
      `${sourceLabel}:${lineNumber} missing closing quote`
    );
    const inner = rawValue.slice(1, -1);
    if (quote === '"') {
      return inner
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    return inner;
  }

  return rawValue.replace(/\s+#.*$/, "");
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
