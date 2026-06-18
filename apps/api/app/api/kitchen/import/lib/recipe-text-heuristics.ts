const RECIPE_SCORE_THRESHOLD = 50;

/**
 * Detect plain-text kitchen recipe sheets (Pomodoro-style exports, .txt files, etc.)
 * so they are not misrouted to event import.
 */
export function looksLikeKitchenRecipeText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 20) {
    return false;
  }

  let score = 0;

  if (/\bYIELDS?\b/i.test(trimmed)) {
    score += 40;
  }

  const quantityMatches = trimmed.match(
    /\b\d+(?:\s+\d+\/\d+)?\s*(?:CUP|CUPS|GALLON|GALLONS|POUND|POUNDS|TBSP|TABLESPOON|QUART|QTS?|#)\b/gi
  );
  score += Math.min((quantityMatches?.length ?? 0) * 15, 45);

  if (/^\s*\d+\.\s+\S/m.test(trimmed)) {
    score += 25;
  }

  if (
    /\b(?:MELT|COOK|ADD|BLEND|MIX|SEASON|WHISK|DRAIN|BRING|EMULSIFY|DISSOLVE)\b/i.test(
      trimmed
    )
  ) {
    score += 10;
  }

  return score >= RECIPE_SCORE_THRESHOLD;
}
