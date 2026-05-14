"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Eye, FileText, Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import {
  CONTRACT_TYPE_CONFIG,
  formatDateShort,
  VC_STATUS_CONFIG,
} from "../components/vc-shared";

interface VendorContract {
  id: string;
  contractNumber: string;
  vendorName: string | null;
  contractType: string;
  status: string;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  paymentTerms: string;
  complianceScore: number;
  notes: string | null;
}

export default function VendorContractsPage() {
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [contractNumber, setContractNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [contractType, setContractType] = useState("purchase");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("NET_30");
  const [contractNotes, setContractNotes] = useState("");

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/procurement/vendor-contracts/list");
      const data = await res.json();
      if (data.success) {
        setContracts(data.data.vendorContracts || []);
      }
    } catch (error) {
      console.error("Failed to load contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const matchesTab = activeTab === "all" || c.status === activeTab;
      const matchesSearch =
        !searchQuery ||
        c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.vendorName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [contracts, activeTab, searchQuery]);

  const handleCreate = async () => {
    if (!(contractNumber && vendorId && startDate)) return;
    setCreating(true);
    try {
      const res = await apiFetch(
        "/api/manifest/VendorContract/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractNumber,
            vendorId,
            contractType,
            startDate,
            endDate: endDate || undefined,
            paymentTerms,
            notes: contractNotes || undefined,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setShowCreateDialog(false);
        resetForm();
        await loadContracts();
      }
    } catch (error) {
      console.error("Failed to create contract:", error);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setContractNumber("");
    setVendorId("");
    setContractType("purchase");
    setStartDate("");
    setEndDate("");
    setPaymentTerms("NET_30");
    setContractNotes("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Vendor Contracts
          </h1>
          <p className="text-muted-foreground">
            Manage vendor agreements and terms.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {(["pending_approval", "active", "expired", "terminated"] as const).map(
          (status) => {
            const config = VC_STATUS_CONFIG[status];
            const count = contracts.filter((c) => c.status === status).length;
            return (
              <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {config.label}
                  </CardTitle>
                  <config.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            );
          }
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by contract # or vendor..."
          value={searchQuery}
        />
      </div>

      {/* Tabs & List */}
      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="rounded-[16px] border border-hairline bg-canvas p-1">
          <TabsTrigger
            className="data-[state=active]:bg-ink data-[state=active]:text-white rounded-[12px] px-4 py-1.5 text-sm font-medium transition-colors"
            value="all"
          >
            All ({contracts.length})
          </TabsTrigger>
          {(
            [
              "draft",
              "pending_approval",
              "active",
              "expired",
              "terminated",
              "cancelled",
            ] as const
          ).map((s) => {
            const count = contracts.filter((c) => c.status === s).length;
            return count > 0 ? (
              <TabsTrigger
                className="data-[state=active]:bg-ink data-[state=active]:text-white rounded-[12px] px-4 py-1.5 text-sm font-medium transition-colors"
                key={s}
                value={s}
              >
                {VC_STATUS_CONFIG[s].label} ({count})
              </TabsTrigger>
            ) : null;
          })}
        </TabsList>
        <TabsContent value={activeTab}>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No vendor contracts found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((contract) => {
                const config =
                  VC_STATUS_CONFIG[contract.status] || VC_STATUS_CONFIG.draft;
                const Icon = config.icon;
                const typeLabel =
                  CONTRACT_TYPE_CONFIG[contract.contractType] ||
                  contract.contractType;
                return (
                  <Card
                    className="hover:border-primary/40 transition-shadow"
                    key={contract.id}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              className="font-semibold hover:underline"
                              href={`/procurement/vendor-contracts/${contract.id}`}
                            >
                              {contract.contractNumber}
                            </Link>
                            <Badge className={config.color}>
                              {config.label}
                            </Badge>
                            <Badge variant="outline">{typeLabel}</Badge>
                            {contract.autoRenew && (
                              <Badge variant="secondary">Auto-Renew</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {contract.vendorName && (
                              <span>{contract.vendorName}</span>
                            )}
                            <span>
                              Start: {formatDateShort(contract.startDate)}
                            </span>
                            {contract.endDate && (
                              <span>
                                End: {formatDateShort(contract.endDate)}
                              </span>
                            )}
                            <span>{contract.paymentTerms}</span>
                            <span>Compliance: {contract.complianceScore}%</span>
                          </div>
                        </div>
                        <Link
                          href={`/procurement/vendor-contracts/${contract.id}`}
                        >
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Vendor Contract</DialogTitle>
            <DialogDescription>
              Create a new vendor contract agreement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractNumber">Contract Number *</Label>
                <Input
                  id="contractNumber"
                  onChange={(e) => setContractNumber(e.target.value)}
                  placeholder="VC-2026-001"
                  value={contractNumber}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendorId">Vendor ID *</Label>
                <Input
                  id="vendorId"
                  onChange={(e) => setVendorId(e.target.value)}
                  placeholder="Vendor UUID"
                  value={vendorId}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract Type</Label>
                <Select onValueChange={setContractType} value={contractType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="distribution">Distribution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select onValueChange={setPaymentTerms} value={paymentTerms}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NET_15">Net 15</SelectItem>
                    <SelectItem value="NET_30">Net 30</SelectItem>
                    <SelectItem value="NET_45">Net 45</SelectItem>
                    <SelectItem value="NET_60">Net 60</SelectItem>
                    <SelectItem value="COD">COD</SelectItem>
                    <SelectItem value="PREPAID">Prepaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <DatePicker
                  id="startDate"
                  onChange={(e) => setStartDate(e.target.value)}
                  value={startDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <DatePicker
                  id="endDate"
                  onChange={(e) => setEndDate(e.target.value)}
                  value={endDate}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vcNotes">Notes</Label>
              <Textarea
                id="vcNotes"
                onChange={(e) => setContractNotes(e.target.value)}
                placeholder="Additional notes..."
                value={contractNotes}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!(contractNumber && vendorId && startDate) || creating}
              onClick={handleCreate}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Contract
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
