/**
 * @module SqlLike
 * @intent Safely escape user input for use inside SQL `LIKE` / `ILIKE` patterns.
 * @responsibility Prevent wildcard injection (`%`, `_`) and backslash injection
 *                 from user-supplied strings being concatenated into a pattern.
 * @domain Shared SQL helpers
 *
 * Why this exists:
 *   Prisma parameterizes the *value* of an `ILIKE` pattern, which prevents
 *   classical SQL injection. It does NOT, however, treat `%` and `_` as literal
 *   characters — they remain pattern metacharacters. A user searching for the
 *   literal string `100%` against a column of vendor names would otherwise
 *   match every name containing `100` followed by anything. Worse, a single
 *   `%` query degenerates into "match all rows" which can DoS a large table.
 *
 *   This helper escapes the three characters that have meaning inside a
 *   `LIKE` / `ILIKE` pattern (`%`, `_`, `\`) using `\` as the escape character.
 *   Callers MUST append `ESCAPE '\\'` to the SQL clause so PostgreSQL knows
 *   to treat `\` as the escape character (this is the default escape character
 *   in PostgreSQL but adding it explicitly makes the contract auditable and
 *   resistant to GUC-level changes).
 */

const LIKE_METACHARACTER_PATTERN = /[\\%_]/g;

/**
 * Escape SQL `LIKE` / `ILIKE` pattern metacharacters in a user-supplied value.
 *
 * @example
 *   escapeLikePattern("100%")         // => "100\\%"
 *   escapeLikePattern("foo_bar")      // => "foo\\_bar"
 *   escapeLikePattern("a\\b")         // => "a\\\\b"
 *   escapeLikePattern("plain")        // => "plain"  (no-op for normal text)
 *
 * Use with `ESCAPE '\\'` in SQL:
 *
 *   const safe = escapeLikePattern(userInput);
 *   await db.$queryRaw`
 *     SELECT * FROM t WHERE name ILIKE ${`%${safe}%`} ESCAPE '\\'
 *   `;
 */
export function escapeLikePattern(value: string): string {
  return value.replace(LIKE_METACHARACTER_PATTERN, "\\$&");
}

/**
 * Wrap an escaped value as a "contains" pattern: `%value%`.
 * Equivalent to ``${'%'}${escapeLikePattern(value)}${'%'}``.
 */
export function likeContains(value: string): string {
  return `%${escapeLikePattern(value)}%`;
}

/**
 * The escape clause to append to ILIKE/LIKE expressions paired with
 * {@link escapeLikePattern}. Using a constant keeps the contract centralized
 * so any future change to the escape character only happens in one place.
 *
 * Already-quoted SQL fragment — safe to embed directly in a query template.
 */
export const LIKE_ESCAPE_CLAUSE = "ESCAPE '\\'";
