// Pure parser for legacy flat-text recipe instructions → ordered steps.
// If the text contains >=2 numbered lines ("1.", "2)", "Step 3:"), numbered
// mode applies: each numbered line starts a step and unnumbered lines append
// to the current step. Otherwise every non-empty line becomes its own step.
// Steps are always renumbered 1..N and empty instructions are dropped.

const NUMBERED_RE = /^(?:step\s+)?(\d{1,3})\s*[.):]\s*(.*)$/i;
const LINE_BREAK_RE = /\r?\n/;

export interface ParsedInstructionStep {
  instruction: string;
  stepNumber: number;
}

export function parseFlatInstructions(text: string): ParsedInstructionStep[] {
  const lines = text.split(LINE_BREAK_RE).map((line) => line.trim());
  const numberedCount = lines.filter((line) => NUMBERED_RE.test(line)).length;
  const instructions =
    numberedCount >= 2 ? parseNumbered(lines) : lines.filter(Boolean);

  return instructions
    .map((instruction) => instruction.trim())
    .filter(Boolean)
    .map((instruction, index) => ({ instruction, stepNumber: index + 1 }));
}

function parseNumbered(lines: string[]): string[] {
  const out: string[] = [];
  let current: string | null = null;

  for (const line of lines) {
    if (!line) {
      continue;
    }
    const match = line.match(NUMBERED_RE);
    if (match) {
      if (current !== null) {
        out.push(current);
      }
      current = match[2] ?? "";
    } else if (current === null) {
      // Preamble before the first numbered line keeps its own step.
      out.push(line);
    } else {
      // Continuation line — append to the step opened by the last number.
      current = current ? `${current} ${line}` : line;
    }
  }

  if (current !== null) {
    out.push(current);
  }
  return out;
}
