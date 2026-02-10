import { describe, expect, it } from "vitest";
import { parseEnvContents } from "@/app/lib/testing/env";

describe("parseEnvContents", () => {
  it("parses quoted values and ignores comments", () => {
    const contents = [
      "# comment",
      'PLAYWRIGHT_BASE_URL="http://127.0.0.1:2221"',
      "EMPTY_VALUE=",
      "export NEXT_PUBLIC_APP_URL=http://127.0.0.1:2221",
    ].join("\n");

    const result = parseEnvContents(contents, "test.env");
    expect(result.PLAYWRIGHT_BASE_URL).toBe("http://127.0.0.1:2221");
    expect(result.EMPTY_VALUE).toBe("");
    expect(result.NEXT_PUBLIC_APP_URL).toBe("http://127.0.0.1:2221");
  });

  it("throws on invalid lines with a precise message", () => {
    const contents = ["OK=1", "bad line"].join("\n");
    expect(() => parseEnvContents(contents, "test.env")).toThrow(
      "test.env:2 must be KEY=VALUE"
    );
  });
});
