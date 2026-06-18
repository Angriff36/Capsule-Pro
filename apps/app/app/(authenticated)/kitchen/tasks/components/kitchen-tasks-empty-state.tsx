"use client";

import { NoTasksState } from "@repo/design-system/components/blocks/illustrated-empty-states";
import { useRouter } from "next/navigation";
import { SampleDataImportButton } from "../../../components/sample-data-import-button";

/**
 * Client wrapper for the Kitchen Tasks empty state. Lives apart from the server
 * page so it can supply the `onCreateTask` callback and the client-only
 * SampleDataImportButton (a server component cannot pass function props).
 */
export function KitchenTasksEmptyState() {
  const router = useRouter();

  return (
    <NoTasksState
      description="Kitchen tasks track prep, cleaning, and operational work for your team. Create tasks here or from the Production Board, then assign and claim them to keep service on track."
      onCreateTask={() => router.push("/kitchen/tasks/new")}
      secondaryAction={
        <SampleDataImportButton onSeeded={() => router.refresh()} />
      }
      taskType="kitchen tasks"
      userRole="admin"
    />
  );
}
