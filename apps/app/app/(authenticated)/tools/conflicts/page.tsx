import { ConflictsClient } from "./conflicts-client";

export const metadata = {
  title: "Conflict Detection | Tools",
  description:
    "Detect and resolve scheduling, equipment, inventory, and venue conflicts across your operations.",
};

export default function ConflictsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Conflict Detection
        </h1>
        <p className="text-muted-foreground">
          Identify and resolve conflicts across employees, equipment, inventory,
          and venues before they become operational issues.
        </p>
      </div>
      <ConflictsClient />
    </div>
  );
}
