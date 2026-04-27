/**
 * Tests for the LIKE/ILIKE pattern escaper.
 *
 * Why these tests exist:
 *   `escapeLikePattern` is the single point of trust for preventing SQL
 *   wildcard injection across every search route. Each behavior pinned here
 *   reflects a concrete past or potential bug — drifting from any of these
 *   contracts re-opens a class of correctness/abuse issues.
 */

import { describe, expect, it } from "vitest";
import {
  escapeLikePattern,
  LIKE_ESCAPE_CLAUSE,
  likeContains,
} from "../../lib/sql-like";

describe("sql-like", () => {
  describe("escapeLikePattern", () => {
    it("returns plain text unchanged", () => {
      // Common case: ordinary user input has no metacharacters.
      expect(escapeLikePattern("acme")).toBe("acme");
      expect(escapeLikePattern("Vendor Name 42")).toBe("Vendor Name 42");
      expect(escapeLikePattern("")).toBe("");
    });

    it("escapes percent so it does not match anything-and-everything", () => {
      // `100%` would otherwise match `1000abc`, `100`, `100xyz`, etc.
      expect(escapeLikePattern("100%")).toBe("100\\%");
      expect(escapeLikePattern("%")).toBe("\\%");
      expect(escapeLikePattern("a%b%c")).toBe("a\\%b\\%c");
    });

    it("escapes underscore so it does not match any-single-character", () => {
      // `foo_bar` would otherwise match `foo1bar`, `fooXbar`, etc.
      expect(escapeLikePattern("foo_bar")).toBe("foo\\_bar");
      expect(escapeLikePattern("_")).toBe("\\_");
      expect(escapeLikePattern("_a_b_")).toBe("\\_a\\_b\\_");
    });

    it("escapes backslash so attackers cannot break the escape contract", () => {
      // Without escaping `\`, a user could supply `\%` to neutralize our escape
      // and re-inject `%` wildcards.
      expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
      expect(escapeLikePattern("\\%")).toBe("\\\\\\%");
      expect(escapeLikePattern("\\_")).toBe("\\\\\\_");
    });

    it("escapes mixed metacharacters in a single value", () => {
      expect(escapeLikePattern("a%b_c\\d")).toBe("a\\%b\\_c\\\\d");
    });

    it("does not escape characters that have no meaning in LIKE", () => {
      // Single quotes, double quotes, semicolons, newlines, unicode — all
      // safe to leave as-is because Prisma parameterization handles them.
      const input = 'O\'Brien & Sons; "Tëst" \n line';
      expect(escapeLikePattern(input)).toBe(input);
    });

    it("is idempotent only for non-metacharacter input", () => {
      // Important contract: do NOT call this twice — running it twice on a
      // metacharacter-containing string double-escapes.
      const once = escapeLikePattern("a%b");
      const twice = escapeLikePattern(once);
      expect(once).toBe("a\\%b");
      expect(twice).toBe("a\\\\\\%b");
      // For plain input it IS idempotent (because there's nothing to escape).
      expect(escapeLikePattern("plain")).toBe(escapeLikePattern("plain"));
    });
  });

  describe("likeContains", () => {
    it("wraps an escaped value in % wildcards", () => {
      expect(likeContains("acme")).toBe("%acme%");
    });

    it("escapes metacharacters before wrapping", () => {
      // The outer `%` are pattern wildcards (intentional), the inner ones are
      // literal user input (escaped).
      expect(likeContains("100%")).toBe("%100\\%%");
      expect(likeContains("foo_bar")).toBe("%foo\\_bar%");
    });
  });

  describe("LIKE_ESCAPE_CLAUSE", () => {
    it("is the SQL fragment that pairs with the escaped patterns", () => {
      // Pinning this so a refactor to a different escape character (e.g. `!`)
      // can't silently desync the helper from its callers.
      expect(LIKE_ESCAPE_CLAUSE).toBe("ESCAPE '\\'");
    });
  });
});
