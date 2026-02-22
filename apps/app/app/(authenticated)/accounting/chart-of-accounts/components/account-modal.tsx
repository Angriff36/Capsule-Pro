"use client";

/**
 * @module AccountModal
 * @intent Modal for creating and editing chart of accounts
 * @responsibility Handle form input for account CRUD operations with validation
 * @domain Accounting
 * @tags chart-of-accounts, modal, form, accounting
 * @canonical true
 */

import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ACCOUNT_TYPES,
  type ChartOfAccountWithParent,
  type CreateChartOfAccountRequest,
  createChartOfAccount,
  getAccountTypeLabel,
  type UpdateChartOfAccountRequest,
  updateChartOfAccount,
} from "@/app/lib/use-chart-of-accounts";

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  editAccount?: ChartOfAccountWithParent | null;
  parentAccounts?: ChartOfAccountWithParent[];
}

export function AccountModal({
  open,
  onClose,
  onCreated,
  editAccount,
  parentAccounts = [],
}: AccountModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    account_number: "",
    account_name: "",
    account_type: "ASSET" as (typeof ACCOUNT_TYPES)[number],
    parent_id: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    if (editAccount) {
      setFormData({
        account_number: editAccount.account_number,
        account_name: editAccount.account_name,
        account_type: editAccount.account_type,
        parent_id: editAccount.parent_id ?? "",
        description: editAccount.description ?? "",
        is_active: editAccount.is_active,
      });
    } else {
      setFormData({
        account_number: "",
        account_name: "",
        account_type: "ASSET",
        parent_id: "",
        description: "",
        is_active: true,
      });
    }
  }, [editAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.account_number.trim()) {
        toast.error("Account number is required");
        return;
      }
      if (!formData.account_name.trim()) {
        toast.error("Account name is required");
        return;
      }
      if (!formData.account_type) {
        toast.error("Account type is required");
        return;
      }

      const request: CreateChartOfAccountRequest | UpdateChartOfAccountRequest =
        {
          account_number: formData.account_number.trim(),
          account_name: formData.account_name.trim(),
          account_type: formData.account_type,
          parent_id: formData.parent_id || undefined,
          description: formData.description.trim() || undefined,
          is_active: formData.is_active,
        };

      if (editAccount) {
        await updateChartOfAccount(editAccount.id, request);
        toast.success("Account updated successfully");
      } else {
        await createChartOfAccount(request as CreateChartOfAccountRequest);
        toast.success("Account created successfully");
      }

      onCreated();
      onClose();
    } catch (error) {
      console.error("Failed to save account:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save account"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Filter parent accounts to avoid selecting self or creating circular references
  const availableParentAccounts = parentAccounts.filter(
    (acc) =>
      acc.id !== editAccount?.id &&
      acc.is_active &&
      acc.account_type === formData.account_type
  );

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editAccount ? "Edit Account" : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            {editAccount
              ? "Update the account details below."
              : "Add a new account to your chart of accounts."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Account Number & Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  disabled={isLoading}
                  id="account_number"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      account_number: e.target.value,
                    })
                  }
                  placeholder="e.g., 1000"
                  required
                  value={formData.account_number}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name *</Label>
                <Input
                  disabled={isLoading}
                  id="account_name"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      account_name: e.target.value,
                    })
                  }
                  placeholder="e.g., Cash on Hand"
                  required
                  value={formData.account_name}
                />
              </div>
            </div>

            {/* Account Type */}
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type *</Label>
              <Select
                disabled={isLoading}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    account_type: value as (typeof ACCOUNT_TYPES)[number],
                    parent_id: "", // Reset parent when type changes
                  })
                }
                value={formData.account_type}
              >
                <SelectTrigger id="account_type">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getAccountTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Parent Account */}
            {availableParentAccounts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="parent_id">Parent Account</Label>
                  <Select
                  disabled={isLoading}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parent_id: value === "__none__" ? "" : value })
                  }
                  value={formData.parent_id || "__none__"}
                >
                  <SelectTrigger id="parent_id">
                    <SelectValue placeholder="Select parent account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No parent</SelectItem>
                    {availableParentAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_number} - {acc.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                disabled={isLoading}
                id="description"
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter a description for this account..."
                rows={3}
                value={formData.description}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.is_active}
                disabled={isLoading}
                id="is_active"
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    is_active: checked as boolean,
                  })
                }
              />
              <Label className="cursor-pointer font-normal" htmlFor="is_active">
                Active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={isLoading}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isLoading} type="submit">
              {isLoading
                ? "Saving..."
                : editAccount
                  ? "Update Account"
                  : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
