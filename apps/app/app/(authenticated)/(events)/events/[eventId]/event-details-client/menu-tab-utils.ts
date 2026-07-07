export const MENU_TAB_VALUES = ["dishes", "recipes"] as const;

export type MenuTabValue = (typeof MENU_TAB_VALUES)[number];

export function normalizeMenuTab(value: string | null): MenuTabValue {
  if (!value) {
    return "dishes";
  }
  return MENU_TAB_VALUES.includes(value as MenuTabValue)
    ? (value as MenuTabValue)
    : "dishes";
}
