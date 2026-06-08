import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(__dirname, "../../../source");

type Block = {
  body: string;
  line: number;
  name: string;
};

function lineFor(source: string, index: number): number {
  return source.slice(0, index).split(/\r?\n/).length;
}

function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < source.length; index++) {
    const char = source[index];
    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Unclosed block at ${openIndex}`);
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory()
      ? files(path)
      : path.endsWith(".manifest")
        ? [path]
        : [];
  });
}

function entities(source: string): Block[] {
  const out: Block[] = [];
  const pattern = /^entity\s+(\w+)\s*\{/gm;
  for (const match of source.matchAll(pattern)) {
    const open = source.indexOf("{", match.index);
    const close = findMatchingBrace(source, open);
    out.push({
      name: match[1],
      body: source.slice(open + 1, close),
      line: lineFor(source, match.index),
    });
  }
  return out;
}

function createCommand(entityBody: string): Block | undefined {
  const match = /^ {2}command\s+create\s*\(([^)]*)\)\s*\{/m.exec(entityBody);
  if (!match) return undefined;
  const open = entityBody.indexOf("{", match.index);
  const close = findMatchingBrace(entityBody, open);
  return {
    name: "create",
    body: entityBody.slice(open + 1, close),
    line: lineFor(entityBody, match.index),
  };
}

function transitionFromValues(entityBody: string): Map<string, Set<string>> {
  const transitions = new Map<string, Set<string>>();
  for (const match of entityBody.matchAll(
    /^\s*transition\s+(\w+)\s+from\s+"([^"]+)"/gm
  )) {
    const [, property, from] = match;
    const values = transitions.get(property) ?? new Set<string>();
    values.add(from);
    transitions.set(property, values);
  }
  return transitions;
}

function propertyDefaults(entityBody: string): Map<string, string> {
  const defaults = new Map<string, string>();
  for (const match of entityBody.matchAll(
    /^\s*property(?:\s+required)?\s+(\w+)\s*:[^=\n]+=\s*"([^"]+)"/gm
  )) {
    defaults.set(match[1], match[2]);
  }
  return defaults;
}

function createParams(entityBody: string): Set<string> {
  const match = /^ {2}command\s+create\s*\(([^)]*)\)\s*\{/m.exec(entityBody);
  if (!match) return new Set();
  return new Set(
    match[1]
      .split(",")
      .map((part) => part.trim().split(":")[0]?.trim())
      .filter(Boolean)
  );
}

describe("Manifest create commands", () => {
  it("do not re-mutate transition-governed initial state values", () => {
    const offenders: string[] = [];

    for (const file of files(sourceRoot)) {
      const source = readFileSync(file, "utf8");
      for (const entity of entities(source)) {
        const create = createCommand(entity.body);
        if (!create) continue;

        const transitions = transitionFromValues(entity.body);
        if (transitions.size === 0) continue;

        const defaults = propertyDefaults(entity.body);
        const params = createParams(entity.body);

        for (const match of create.body.matchAll(
          /^\s*mutate\s+(\w+)\s*=\s*"([^"]+)"/gm
        )) {
          const [statement, property, value] = match;
          if (
            defaults.get(property) === value &&
            transitions.get(property)?.has(value)
          ) {
            offenders.push(
              `${relative(process.cwd(), file)}:${entity.line + create.line + lineFor(create.body, match.index ?? 0) - 2} ${entity.name}.create ${statement.trim()}`
            );
          }
        }

        for (const match of create.body.matchAll(
          /^\s*mutate\s+(\w+)\s*=\s*(\w+)\s*$/gm
        )) {
          const [statement, property, expression] = match;
          if (
            property === expression &&
            params.has(property) &&
            transitions.has(property)
          ) {
            offenders.push(
              `${relative(process.cwd(), file)}:${entity.line + create.line + lineFor(create.body, match.index ?? 0) - 2} ${entity.name}.create ${statement.trim()}`
            );
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
