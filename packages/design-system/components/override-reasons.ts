export type OverrideReasonCode = "other" | (string & {});

export const OVERRIDE_REASON_CODES: Record<string, string> = {
  other: "Other",
  manager_approval: "Manager approval",
  customer_request: "Customer request",
  equipment_issue: "Equipment issue",
  staffing_shortage: "Staffing shortage",
};
