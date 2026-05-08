"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { ChartOfAccountWithParent } from "@/app/lib/use-chart-of-accounts";
import { AccountModal } from "./components/account-modal";

export function ChartOfAccountsActions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<
    ChartOfAccountWithParent[]
  >([]);

  // Fetch accounts for parent dropdown on mount
  useEffect(() => {
    apiFetch("/api/accounting/accounts?includeInactive=true")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          setParentAccounts(data.data);
        }
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
