"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
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
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  payout_method: string;
}

interface BankAccount {
  id: string;
  employee_id: string;
  bank_name: string;
  account_type: string;
  routing_number: string;
  account_number_last4: string;
  account_holder_name: string;
  is_default: boolean;
  status: string;
  verified_at: string | null;
  verification_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function getEmployeeName(e: Employee): string {
  return [e.first_name, e.last_name].filter(Boolean).join(" ") || e.email;
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function maskRoutingNumber(routing: string): string {
  return `****${routing.slice(-4)}`;
}

export default function DirectDepositPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null
  );
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<BankAccount | null>(null);
  const [verifyMethod, setVerifyMethod] = useState("micro_deposit");

  // Form state
  const [formBankName, setFormBankName] = useState("");
  const [formAccountType, setFormAccountType] = useState("checking");
  const [formRoutingNumber, setFormRoutingNumber] = useState("");
  const [formAccountNumber, setFormAccountNumber] = useState("");
  const [formAccountHolderName, setFormAccountHolderName] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEmployeeId) params.set("employeeId", selectedEmployeeId);

      const res = await apiFetch(
        `/api/payroll/bank-accounts?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch bank accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
      setEmployees(data.employees || []);
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
      toast.error("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function resetForm() {
    setFormBankName("");
    setFormAccountType("checking");
    setFormRoutingNumber("");
    setFormAccountNumber("");
    setFormAccountHolderName("");
    setFormIsDefault(false);
    setEditingAccount(null);
  }

  function openCreateModal() {
    resetForm();
    if (selectedEmployeeId) {
      const emp = employees.find((e) => e.id === selectedEmployeeId);
      if (emp) setFormAccountHolderName(getEmployeeName(emp));
    }
    setModalOpen(true);
  }

  function openEditModal(account: BankAccount) {
    setEditingAccount(account);
    setFormBankName(account.bank_name);
    setFormAccountType(account.account_type);
    setFormRoutingNumber(account.routing_number);
    setFormAccountNumber("");
    setFormAccountHolderName(account.account_holder_name);
    setFormIsDefault(account.is_default);
    setModalOpen(true);
  }

  async function handleSave() {
    setActionLoading("save");
    try {
      const body: any = {
        bankName: formBankName,
        accountType: formAccountType,
        routingNumber: formRoutingNumber,
        accountHolderName: formAccountHolderName,
      };

      if (formAccountNumber) {
        body.accountNumber = formAccountNumber;
      }

      if (editingAccount) {
        body.id = editingAccount.id;
        const res = await apiFetch(
          "/api/payroll/bank-accounts/commands/update",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update");
        }
        toast.success("Bank account updated");
      } else {
        body.employeeId = selectedEmployeeId;
        body.isDefault = formIsDefault;
        if (!body.employeeId) {
          toast.error("Select an employee first");
          setActionLoading(null);
          return;
        }
        const res = await apiFetch(
          "/api/payroll/bank-accounts/commands/create",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create");
        }
        toast.success("Bank account added");
      }

      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save bank account");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(accountId: string) {
    if (!confirm("Delete this bank account?")) return;
    setActionLoading(accountId);
    try {
      const res = await apiFetch("/api/payroll/bank-accounts/commands/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: accountId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Bank account removed");
      fetchData();
    } catch {
      toast.error("Failed to delete bank account");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSetDefault(accountId: string) {
    setActionLoading(accountId);
    try {
      const res = await apiFetch(
        "/api/payroll/bank-accounts/commands/set-default",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: accountId }),
        }
      );
      if (!res.ok) throw new Error("Failed to set default");
      toast.success("Default account updated");
      fetchData();
    } catch {
      toast.error("Failed to set default account");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleVerify() {
    if (!verifyTarget) return;
    setActionLoading("verify");
    try {
      const res = await apiFetch("/api/payroll/bank-accounts/commands/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: verifyTarget.id, method: verifyMethod }),
      });
      if (!res.ok) throw new Error("Failed to verify");
      toast.success("Bank account verified");
      setVerifyModalOpen(false);
      setVerifyTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to verify bank account");
    } finally {
      setActionLoading(null);
    }
  }

  // Get accounts for selected employee
  const displayAccounts = accounts;

  // Summary stats
  const totalAccounts = accounts.length;
  const verifiedAccounts = accounts.filter(
    (a) => a.status === "verified"
  ).length;
  const pendingAccounts = accounts.filter((a) => a.status === "pending").length;
  const directDepositEmployees = employees.filter(
    (e) => e.payout_method === "direct_deposit"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-foreground">
            Direct Deposit
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage employee bank accounts and payout preferences
          </p>
        </div>
        <Button onClick={openCreateModal} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Bank Account
        </Button>
      </div>

      <Separator />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted/50 rounded-lg">
                <Landmark className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAccounts}</p>
                <p className="text-xs text-muted-foreground">Total Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted/50 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verifiedAccounts}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted/50 rounded-lg">
                <Clock className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingAccounts}</p>
                <p className="text-xs text-muted-foreground">
                  Pending Verification
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted/50 rounded-lg">
                <Users className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{directDepositEmployees}</p>
                <p className="text-xs text-muted-foreground">
                  Direct Deposit Enabled
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Filter by Employee
              </Label>
              <Select
                onValueChange={(val) =>
                  setSelectedEmployeeId(val === "all" ? "" : val)
                }
                value={selectedEmployeeId || "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {getEmployeeName(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Badge className="text-xs" variant="secondary">
                <CreditCard className="mr-1 h-3 w-3" />
                {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      {loading ? (
        <Card className="p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : displayAccounts.length === 0 ? (
        <Card className="p-8 text-center">
          <Landmark className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground font-medium">
            No bank accounts found
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedEmployeeId
              ? "Add a bank account for this employee to get started"
              : "Select an employee or add a bank account to get started"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayAccounts.map((account) => {
            const employee = employees.find(
              (e) => e.id === account.employee_id
            );
            return (
              <Card key={account.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-xl ${
                          account.status === "verified"
                            ? "bg-muted/50"
                            : "bg-muted/20"
                        } border border-hairline`}
                      >
                        <Landmark className={"h-5 w-5 text-foreground"} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">
                            {account.bank_name}
                          </p>
                          {account.is_default && (
                            <Badge
                              className="text-[10px] gap-1"
                              variant="secondary"
                            >
                              <Star className="h-2.5 w-2.5" />
                              Default
                            </Badge>
                          )}
                          <Badge
                            className={
                              account.status === "verified"
                                ? "bg-muted/50 text-foreground"
                                : "bg-muted/50 text-foreground"
                            }
                            variant={
                              account.status === "verified"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {account.status === "verified" ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            {account.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <p>
                            {account.account_type === "checking"
                              ? "Checking"
                              : "Savings"}{" "}
                            •••• {account.account_number_last4}
                          </p>
                          <p>
                            Routing: {maskRoutingNumber(account.routing_number)}
                          </p>
                          <p>Holder: {account.account_holder_name}</p>
                        </div>
                        {employee && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Employee: {getEmployeeName(employee)}{" "}
                            <span className="ml-2">
                              <Badge
                                className="text-[10px] gap-1"
                                variant="outline"
                              >
                                <ArrowLeftRight className="h-2.5 w-2.5" />
                                {employee.payout_method}
                              </Badge>
                            </span>
                          </p>
                        )}
                        {account.verified_at && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Verified {formatDate(account.verified_at)}
                            {account.verification_method &&
                              ` via ${account.verification_method}`}
                          </p>
                        )}
                        {account.notes && (
                          <p className="text-[10px] text-muted-foreground mt-1 italic">
                            {account.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      {account.status !== "verified" && (
                        <Button
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                          disabled={actionLoading === account.id}
                          onClick={() => {
                            setVerifyTarget(account);
                            setVerifyModalOpen(true);
                          }}
                          size="icon"
                          title="Verify account"
                          variant="ghost"
                        >
                          {actionLoading === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {!account.is_default && (
                        <Button
                          className="h-8 w-8 text-amber-600 hover:text-amber-700"
                          disabled={actionLoading === account.id}
                          onClick={() => handleSetDefault(account.id)}
                          size="icon"
                          title="Set as default"
                          variant="ghost"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        className="h-8 w-8"
                        disabled={actionLoading === account.id}
                        onClick={() => openEditModal(account)}
                        size="icon"
                        title="Edit"
                        variant="ghost"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        disabled={actionLoading === account.id}
                        onClick={() => handleDelete(account.id)}
                        size="icon"
                        title="Delete"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog onOpenChange={setModalOpen} open={modalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Bank Account" : "Add Bank Account"}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? "Update bank account details"
                : "Add a new bank account for direct deposit"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!(editingAccount || selectedEmployeeId) && (
              <div className="rounded-lg border border-hairline bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-foreground text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Select an employee from the filter above before adding an
                  account.
                </div>
              </div>
            )}

            <div>
              <Label>Bank Name</Label>
              <Input
                onChange={(e) => setFormBankName(e.target.value)}
                placeholder="e.g. Chase, Bank of America"
                value={formBankName}
              />
            </div>

            <div>
              <Label>Account Type</Label>
              <Select
                onValueChange={setFormAccountType}
                value={formAccountType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Routing Number</Label>
              <Input
                className="font-mono"
                maxLength={9}
                onChange={(e) =>
                  setFormRoutingNumber(
                    e.target.value.replace(/\D/g, "").slice(0, 9)
                  )
                }
                placeholder="9-digit routing number"
                value={formRoutingNumber}
              />
            </div>

            <div>
              <Label>
                Account Number
                {editingAccount && (
                  <span className="text-muted-foreground font-normal ml-2">
                    (leave blank to keep current: ••••{" "}
                    {editingAccount.account_number_last4})
                  </span>
                )}
              </Label>
              <Input
                className="font-mono"
                maxLength={17}
                onChange={(e) =>
                  setFormAccountNumber(
                    e.target.value.replace(/\D/g, "").slice(0, 17)
                  )
                }
                placeholder="4-17 digit account number"
                type="password"
                value={formAccountNumber}
              />
            </div>

            <div>
              <Label>Account Holder Name</Label>
              <Input
                onChange={(e) => setFormAccountHolderName(e.target.value)}
                placeholder="Name on the account"
                value={formAccountHolderName}
              />
            </div>

            {!editingAccount && (
              <div className="flex items-center gap-2">
                <input
                  checked={formIsDefault}
                  className="rounded border-gray-300"
                  id="isDefault"
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  type="checkbox"
                />
                <Label className="text-sm" htmlFor="isDefault">
                  Set as default deposit account
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setModalOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={
                actionLoading === "save" ||
                !formBankName ||
                !formRoutingNumber ||
                !formAccountHolderName ||
                !(editingAccount || formAccountNumber)
              }
              onClick={handleSave}
            >
              {actionLoading === "save" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingAccount ? "Save Changes" : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Modal */}
      <Dialog onOpenChange={setVerifyModalOpen} open={verifyModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Verify Bank Account</DialogTitle>
            <DialogDescription>
              Confirm verification for •••• {verifyTarget?.account_number_last4}{" "}
              at {verifyTarget?.bank_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Verification Method</Label>
              <Select onValueChange={setVerifyMethod} value={verifyMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="micro_deposit">
                    Micro-deposits (2 small deposits)
                  </SelectItem>
                  <SelectItem value="plaid">
                    Plaid (instant verification)
                  </SelectItem>
                  <SelectItem value="manual">Manual verification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {verifyMethod === "micro_deposit" && (
              <div className="rounded-lg bg-muted/20 p-3 border border-hairline text-xs text-muted-foreground">
                Two small deposits (under $1.00) will be sent to this account.
                The employee should verify the amounts in their bank statement.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setVerifyModalOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={actionLoading === "verify"}
              onClick={handleVerify}
            >
              {actionLoading === "verify" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Verify Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
