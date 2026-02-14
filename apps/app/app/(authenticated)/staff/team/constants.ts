export const roleOptions = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
] as const;

export const employmentTypeOptions = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contractor", label: "Contractor" },
  { value: "temp", label: "Temp" },
] as const;

export type RoleValue = (typeof roleOptions)[number]["value"];
export type EmploymentTypeValue =
  (typeof employmentTypeOptions)[number]["value"];
