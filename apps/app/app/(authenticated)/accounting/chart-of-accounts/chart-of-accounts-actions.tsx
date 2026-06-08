"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useEffect, useState } from "react";
import { listChartOfAccounts } from "@/app/lib/manifest-client.generated";
import type { ChartOfAccountWithParent } from "@/app/lib/chart-of-accounts";
import { AccountModal } from "./components/account-modal";

export function ChartOfAccountsActions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<
    ChartOfAccountWithParent[]
  >([]);

  // Fetch accounts for parent dropdown on mount
  useEffect(() => {
    listChartOfAccounts()
      .then((accounts) => {
        setParentAccounts(accounts as unknown as ChartOfAccountWithParent[]);
      })
      .catch(() => {
        // Silently fail — parent dropdown just won't show
      });
  }, []);

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>Add Account</Button>
      <AccountModal
        onClose={() => setIsModalOpen(false)}
        onCreated={() => window.location.reload()}
        open={isModalOpen}
        parentAccounts={parentAccounts}
      />
    </>
  );
}
