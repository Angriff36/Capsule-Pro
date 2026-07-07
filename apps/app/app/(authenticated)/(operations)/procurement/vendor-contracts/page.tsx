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
import { OperationalPageShell } from "../../../components/operational-page-shell";
import {
  listVendorContracts,
  vendorContractCreate,
} from "@/app/lib/manifest-client.generated";
import {
  CONTRACT_TYPE_CONFIG,
  formatDateShort,
  VC_STATUS_CONFIG,
  type VCStatusConfig,
} from "../components/vc-shared";

interface VendorContract {
  autoRenew: boolean;
  complianceScore: number;
  contractNumber: string;
  contractType: string;
  endDate: string | null;
  id: string;
  notes: string | null;
  paymentTerms: string;
  startDate: string;
  status: string;
  vendorName: string | null;
}

const getVcStatusConfig = (status: string): VCStatusConfig =>
  VC_STATUS_CONFIG[status] ?? {
    label: status || "Unknown",
    color: "bg-muted/50 text-foreground",
    icon: FileText,
  };

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
      const result = await listVendorContracts();
      setContracts(result.data as unknown as VendorContract[]);
    } catch (error) {
      console.error("Failed to load contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () =>
      contracts.filter((c) => {
        const matchesTab = activeTab === "all" || c.status === activeTab;
        const matchesSearch =
          !searchQuery ||
          c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.vendorName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
      }),
    [contracts, activeTab, searchQuery]
  );

  const handleCreate = async () => {
    if (!(contractNumber && vendorId && startDate)) {
      return;
    }
    setCreating(true);
    try {
      await vendorContractCreate({
        contractNumber,
        vendorId,
        contractType,
        startDate,
        endDate: endDate || undefined,
        paymentTerms,
        notes: contractNotes || undefined,
      });
      setShowCreateDialog(false);
      resetForm();
      await loadContracts();
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
    <>
      <OperationalPageShell
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        }
        description="Manage vendor agreements and terms."
        eyebrow="Procurement / Vendor contracts"
        title="Vendor contracts"
      >

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {(["pending_approval", "active", "expired", "terminated"] as const).map(
          (status) => {
            const config = getVcStatusConfig(status);
            const count = contracts.filter((c) => c.status === status).length;
            return (
              <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">
                    {config.label}
                  </CardTitle>
                  <config.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{count}</div>
                </CardContent>
              </Card>
            );
          }
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            className="rounded-[12px] px-4 py-1.5 font-medium text-sm transition-colors data-[state=active]:bg-ink data-[state=active]:text-white"
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
                className="rounded-[12px] px-4 py-1.5 font-medium text-sm transition-colors data-[state=active]:bg-ink data-[state=active]:text-white"
                key={s}
                value={s}
              >
                {getVcStatusConfig(s).label} ({count})
              </TabsTrigger>
            ) : null;
          })}
        </TabsList>
        <TabsContent value={activeTab}>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>No vendor contracts found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((contract) => {
                const config = getVcStatusConfig(contract.status);
                const Icon = config.icon;
                const typeLabel =
                  CONTRACT_TYPE_CONFIG[contract.contractType] ||
                  contract.contractType;
                return (
                  <Card
                    className="transition-shadow hover:border-primary/40"
                    key={contract.id}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
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
                          <div className="flex items-center gap-4 text-muted-foreground text-sm">
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
                            <Eye className="mr-1 h-4 w-4" />
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

      </OperationalPageShell>

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
          <div className="mt-4 flex justify-end gap-2">
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
    </>
  );
}
