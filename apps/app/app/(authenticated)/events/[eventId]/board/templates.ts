export type BranchKey = "staff" | "menu" | "vehicles" | "equipment" | "battleboard";
export type BranchRequirement = "required" | "optional" | "excluded";

export interface BranchDef {
  key: BranchKey;
  label: string;
  color: string; // hex used for branch stroke/leaf outline
  requirement: BranchRequirement;
  /** Minimum count needed; receives guestCount for ratio rules. */
  minNeeded: (guestCount: number) => number;
}

export interface EventBoardTemplate {
  key: string;
  label: string;
  branches: BranchDef[];
}

const zero = () => 0;
const one = () => 1;
const staffPer20 = (guests: number) => Math.max(1, Math.ceil(guests / 20));

const BASE_BRANCHES: Omit<BranchDef, "requirement" | "minNeeded">[] = [
  { key: "staff", label: "Staff", color: "#6366f1" },
  { key: "menu", label: "Menu", color: "#ec4899" },
  { key: "vehicles", label: "Vehicles", color: "#f59e0b" },
  { key: "equipment", label: "Equipment", color: "#14b8a6" },
  { key: "battleboard", label: "Battle Board", color: "#0ea5e9" },
];

function makeTemplate(
  key: string,
  label: string,
  rules: Record<BranchKey, { requirement: BranchRequirement; minNeeded?: (g: number) => number }>
): EventBoardTemplate {
  return {
    key,
    label,
    branches: BASE_BRANCHES.map((b) => ({
      ...b,
      requirement: rules[b.key].requirement,
      minNeeded: rules[b.key].minNeeded ?? (rules[b.key].requirement === "required" ? one : zero),
    })),
  };
}

const TEMPLATES: Record<string, EventBoardTemplate> = {
  general: makeTemplate("general", "General", {
    staff: { requirement: "required", minNeeded: one },
    menu: { requirement: "required" },
    vehicles: { requirement: "optional" },
    equipment: { requirement: "optional" },
    battleboard: { requirement: "optional" },
  }),
  plated_dinner: makeTemplate("plated_dinner", "Plated Dinner", {
    staff: { requirement: "required", minNeeded: staffPer20 },
    menu: { requirement: "required" },
    vehicles: { requirement: "required" },
    equipment: { requirement: "required" },
    battleboard: { requirement: "optional" },
  }),
  drop_off: makeTemplate("drop_off", "Drop-off", {
    staff: { requirement: "required", minNeeded: one },
    menu: { requirement: "required" },
    vehicles: { requirement: "required" },
    equipment: { requirement: "excluded" },
    battleboard: { requirement: "optional" },
  }),
};

export function resolveTemplate(eventType: string): EventBoardTemplate {
  return TEMPLATES[eventType] ?? TEMPLATES.general;
}

export type BranchState = "ready" | "partial" | "missing" | "optional" | "excluded";

export interface BranchStatus {
  key: BranchKey;
  label: string;
  color: string;
  requirement: BranchRequirement;
  needed: number;
  have: number;
  state: BranchState;
}

export interface BoardStatus {
  branches: BranchStatus[];
  readyPercent: number;
}

export function computeBranchStatus(
  template: EventBoardTemplate,
  input: { guestCount: number; counts: Record<BranchKey, number> }
): BoardStatus {
  const branches = template.branches.map((b): BranchStatus => {
    const needed = b.requirement === "excluded" ? 0 : b.minNeeded(input.guestCount);
    const have = input.counts[b.key] ?? 0;
    let state: BranchState;
    if (b.requirement === "excluded") state = "excluded";
    else if (b.requirement === "optional" && needed === 0) state = have > 0 ? "ready" : "optional";
    else if (have >= needed) state = "ready";
    else if (have > 0) state = "partial";
    else state = "missing";
    return { key: b.key, label: b.label, color: b.color, requirement: b.requirement, needed, have, state };
  });
  const required = branches.filter((b) => b.requirement === "required");
  const satisfied = required.filter((b) => b.state === "ready").length;
  const readyPercent = required.length === 0 ? 100 : Math.round((satisfied / required.length) * 100);
  return { branches, readyPercent };
}
