/** Display labels for QACheck list/status (Manifest lifecycle). */

export const qaCheckTypeLabels: Record<string, string> = {
  temperature: "Temperature",
  sanitation: "Sanitation",
  storage: "Storage",
  labeling: "Labeling",
  equipment: "Equipment",
};

export const qaCheckStatusBadge: Record<
  string,
  "destructive" | "default" | "secondary" | "outline"
> = {
  pending: "secondary",
  completed: "default",
  reinspection_required: "outline",
};

export function qaCheckListTitle(check: {
  checkType: string;
  location?: string | null;
}): string {
  const typeLabel = qaCheckTypeLabels[check.checkType] ?? check.checkType;
  const location = (check.location ?? "").trim();
  return location ? `${typeLabel} — ${location}` : typeLabel;
}
