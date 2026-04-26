/**
 * sanitize.ts test suite
 *
 * These helpers protect public mutation endpoints (contract signing, proposal
 * responses) from stored XSS by stripping HTML tags and HTML-encoding the
 * remaining characters that could break out of an attribute or text node.
 * Length capping prevents resource exhaustion via oversized inputs.
 */

import { describe, expect, it } from "vitest";
import { sanitizeEmail, sanitizeText } from "../../lib/sanitize";

describe("sanitizeText", () => {
  it("returns empty string for non-string input", () => {
    // Defensive: route handlers receive arbitrary JSON, so a number/null/undefined
    // must not crash the helper.
    expect(sanitizeText(undefined as unknown as string)).toBe("");
    expect(sanitizeText(null as unknown as string)).toBe("");
    expect(sanitizeText(123 as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("strips HTML tags", () => {
    // Critical: <script> tag and its text content must be stripped before
    // encoding, otherwise the inner JS would survive as encoded text.
    expect(sanitizeText("<script>alert(1)</script>safe")).toBe(
      "alert(1)safe"
    );
    expect(sanitizeText("<b>bold</b> text")).toBe("bold text");
  });

  it("encodes ampersands, angle brackets, and quotes that survive tag stripping", () => {
    // After tag stripping, any leftover special chars must be HTML-entity
    // encoded so they cannot reopen an attribute boundary downstream.
    expect(sanitizeText("a & b")).toBe("a &amp; b");
    expect(sanitizeText('say "hi"')).toBe("say &quot;hi&quot;");
    expect(sanitizeText("it's")).toBe("it&#x27;s");
  });

  it("encodes ampersand BEFORE other entities to avoid double-encoding", () => {
    // If `<` were encoded first, the resulting `&lt;` would itself be re-encoded
    // to `&amp;lt;`. Verify the implementation order is correct.
    const out = sanitizeText("&");
    expect(out).toBe("&amp;");
  });

  it("enforces default max length of 1000 characters", () => {
    const longInput = "a".repeat(1500);
    expect(sanitizeText(longInput).length).toBe(1000);
  });

  it("respects custom max length", () => {
    const longInput = "a".repeat(500);
    expect(sanitizeText(longInput, 100).length).toBe(100);
  });

  it("strips tag attributes containing JS handlers", () => {
    // The regex /<[^>]*>/g removes the entire tag including attributes, so
    // onerror/onclick payloads cannot survive.
    expect(sanitizeText('<img src=x onerror="alert(1)">')).toBe("");
  });

  it("does not preserve tag-internal whitespace as visible text", () => {
    expect(sanitizeText("clean<br/>text")).toBe("cleantext");
  });

  it("returns empty string when input is only whitespace", () => {
    expect(sanitizeText("   ")).toBe("");
  });
});

describe("sanitizeEmail", () => {
  it("returns empty string for non-string input", () => {
    expect(sanitizeEmail(undefined as unknown as string)).toBe("");
    expect(sanitizeEmail(null as unknown as string)).toBe("");
    expect(sanitizeEmail(42 as unknown as string)).toBe("");
  });

  it("lowercases and trims valid email", () => {
    expect(sanitizeEmail("  USER@EXAMPLE.COM  ")).toBe("user@example.com");
  });

  it("accepts plus addressing and dots", () => {
    expect(sanitizeEmail("first.last+tag@example.co.uk")).toBe(
      "first.last+tag@example.co.uk"
    );
  });

  it("rejects emails missing @ symbol", () => {
    expect(sanitizeEmail("notanemail")).toBe("");
  });

  it("rejects emails missing TLD", () => {
    expect(sanitizeEmail("user@host")).toBe("");
  });

  it("rejects emails with single-char TLD", () => {
    expect(sanitizeEmail("user@host.x")).toBe("");
  });

  it("rejects emails containing whitespace inside the local or domain part", () => {
    expect(sanitizeEmail("user name@example.com")).toBe("");
    expect(sanitizeEmail("user@exa mple.com")).toBe("");
  });

  it("rejects emails longer than 254 characters", () => {
    // RFC 5321 caps the practical address length at 254.
    const local = "a".repeat(245);
    const tooLong = `${local}@x.io`; // 245 + 5 = 250  -> still valid
    expect(sanitizeEmail(tooLong)).toBe(tooLong);

    const local2 = "a".repeat(250);
    const overLimit = `${local2}@x.io`; // 250 + 5 = 255 -> rejected
    expect(sanitizeEmail(overLimit)).toBe("");
  });

  it("rejects emails with HTML injection attempts", () => {
    // The regex anchors with ^ and $, so <script> chars cannot pass even if
    // they happen to surround a valid-looking address fragment.
    expect(sanitizeEmail("<script>@example.com")).toBe("");
    expect(sanitizeEmail("user@<script>.com")).toBe("");
  });

  it("rejects empty string", () => {
    expect(sanitizeEmail("")).toBe("");
    expect(sanitizeEmail("   ")).toBe("");
  });
});
