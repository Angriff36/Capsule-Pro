/**
 * Fuzzy Search Utilities
 *
 * Provides fuzzy matching and string similarity functions for search suggestions.
 */

/**
 * Calculate Levenshtein distance between two strings.
 * Used to determine how similar two strings are.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (a.charAt(j - 1) === b.charAt(i - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity ratio between two strings (0-1).
 * 1 = identical, 0 = completely different
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Check if query is a fuzzy match for target.
 * Returns true if similarity is above threshold.
 */
export function isFuzzyMatch(
  query: string,
  target: string,
  threshold = 0.6
): boolean {
  return stringSimilarity(query, target) >= threshold;
}

/**
 * Find the best fuzzy matches from a list of candidates.
 * Returns candidates sorted by similarity score.
 */
export interface FuzzyMatchResult<T> {
  item: T;
  score: number;
  matchedTerm: string;
}

export function findFuzzyMatches<T>(
  query: string,
  candidates: T[],
  getSearchableText: (item: T) => string[],
  threshold = 0.4,
  maxResults = 5
): FuzzyMatchResult<T>[] {
  const normalizedQuery = query.toLowerCase().trim();

  const results: FuzzyMatchResult<T>[] = [];

  for (const item of candidates) {
    const searchTerms = getSearchableText(item);
    let bestScore = 0;
    let bestTerm = "";

    for (const term of searchTerms) {
      const normalizedTerm = term.toLowerCase();

      // Check for exact substring match first (higher priority)
      if (normalizedTerm.includes(normalizedQuery)) {
        const score =
          0.8 + (normalizedQuery.length / normalizedTerm.length) * 0.2;
        if (score > bestScore) {
          bestScore = score;
          bestTerm = term;
        }
        continue;
      }

      // Check for fuzzy match
      const similarity = stringSimilarity(normalizedQuery, normalizedTerm);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestTerm = term;
      }

      // Also check if any word in the term starts with query
      const words = normalizedTerm.split(/\s+/);
      for (const word of words) {
        if (word.startsWith(normalizedQuery)) {
          const score = 0.7 + (normalizedQuery.length / word.length) * 0.2;
          if (score > bestScore) {
            bestScore = score;
            bestTerm = term;
          }
        }
      }
    }

    if (bestScore >= threshold) {
      results.push({
        item,
        score: bestScore,
        matchedTerm: bestTerm,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, maxResults);
}

/**
 * Generate typo-tolerant search variations.
 * Useful for expanding search queries.
 */
export function generateSearchVariations(query: string): string[] {
  const variations = [query.toLowerCase()];

  // Common typo patterns
  const typoPatterns: Array<[RegExp, string]> = [
    [/ph/g, "f"],
    [/f/g, "ph"],
    [/ie/g, "ei"],
    [/ei/g, "ie"],
    [/c/g, "s"],
    [/s/g, "c"],
    [/z/g, "s"],
    [/k/g, "c"],
    [/ou/g, "o"],
    [/o/g, "ou"],
  ];

  for (const [pattern, replacement] of typoPatterns) {
    const variation = query.toLowerCase().replace(pattern, replacement);
    if (variation !== query.toLowerCase()) {
      variations.push(variation);
    }
  }

  return variations;
}
