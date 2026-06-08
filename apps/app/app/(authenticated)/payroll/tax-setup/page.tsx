"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import {
  Calculator,
  CheckCircle2,
  DollarSign,
  Loader2,
  Plus,
  Settings,
  Shield,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
// NOTE: Keeping apiFetch for all calls — tax list/brackets/preview endpoints are custom actions with no generated client

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TaxConfiguration {
  id: string;
  tax_type: string;
  jurisdiction: string;
  state_code: string | null;
  is_active: boolean;
  created_at: string;
}

interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

interface FicaRates {
  socialSecurityRate: number;
  socialSecurityWageBase: number;
  medicareRate: number;
  medicareAdditionalRate: number;
}

interface BracketsResponse {
  success: boolean;
  data: {
    taxYear: number;
    federalBrackets: {
      single: TaxBracket[];
      married: TaxBracket[];
    };
    ficaRates: FicaRates;
    standardDeductions: {
      single: number;
      married: number;
      headOfHousehold: number;
    };
    supportedJurisdictions: string[];
  };
}

interface TaxPreviewItem {
  type: string;
  jurisdiction: string | null;
  amount: number;
  annualized: number;
}

interface TaxPreviewResponse {
  success: boolean;
  data: {
    grossAnnualIncome: number;
    filingStatus: string;
    state: string | null;
    biweeklyWithholding: TaxPreviewItem[];
    totalAnnualTax: number;
    effectiveRate: number;
  };
}

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];

const NO_STATE_TAX = ["TX", "FL", "WA", "NV", "WY", "AK", "SD", "NH", "TN"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

import { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";

const formatPercent = (n: number) => `${(n * 100).toFixed(2)}%`;

const formatBracketRange = (b: TaxBracket) =>
  `${formatCurrency(b.min)} – ${b.max ? formatCurrency(b.max) : "∞"}`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TaxSetupPage() {
  const [configs, setConfigs] = useState<TaxConfiguration[]>([]);
  const [brackets, setBrackets] = useState<BracketsResponse["data"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [showAddState, setShowAddState] = useState(false);
  const [selectedState, setSelectedState] = useState("");

  // Tax preview state
  const [previewIncome, setPreviewIncome] = useState("60000");
  const [previewStatus, setPreviewStatus] = useState("single");
  const [previewState, setPreviewState] = useState("CA");
  const [previewResult, setPreviewResult] = useState<
    TaxPreviewResponse["data"] | null
  >(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taxConfigToDelete, setTaxConfigToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configsRes, bracketsRes] = await Promise.all([
        apiFetch("/api/payroll/tax/list"),
        apiFetch("/api/payroll/tax/brackets"),
      ]);
      const configsData = await configsRes.json();
      const bracketsData = await bracketsRes.json();
      if (configsData.success)
        setConfigs(configsData.data.configurations || []);
      if (bracketsData.success) setBrackets(bracketsData.data);
    } catch (error) {
      console.error("Failed to load tax data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleActive = async (configId: string, isActive: boolean) => {
    try {
      await apiFetch("/api/payroll/tax/list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId, isActive }),
      });
      setConfigs((prev) =>
        prev.map((c) => (c.id === configId ? { ...c, is_active: isActive } : c))
      );
    } catch (error) {
      console.error("Failed to toggle config:", error);
    }
  };

  const handleAddStateTax = async () => {
    if (!selectedState) return;
    setShowAddState(false);
    setSelectedState("");
    await loadData();
  };

  const handleDeleteStateTax = async (configId: string) => {
    try {
      await apiFetch("/api/payroll/tax/list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId, isActive: false }),
      });
      setConfigs((prev) => prev.filter((c) => c.id !== configId));
    } catch (error) {
      console.error("Failed to delete tax config:", error);
    } finally {
      setDeleteDialogOpen(false);
      setTaxConfigToDelete(null);
    }
  };

  const confirmDeleteStateTax = (config: TaxConfiguration) => {
    setTaxConfigToDelete({
      id: config.id,
      name: config.state_code || config.jurisdiction,
    });
    setDeleteDialogOpen(true);
  };

  const runTaxPreview = async () => {
    const income = Number.parseFloat(previewIncome);
    if (!income || income <= 0) return;

    setPreviewLoading(true);
    try {
      const res = await apiFetch("/api/payroll/tax/brackets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grossAnnualIncome: income,
          filingStatus: previewStatus,
          state: previewState,
        }),
      });
      const data = await res.json();
      if (data.success) setPreviewResult(data.data);
    } catch (error) {
      console.error("Tax preview failed:", error);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <PageCanvas>
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageCanvas>
    );
  }

  const federalConfig = configs.find((c) => c.tax_type === "federal");
  const stateConfigs = configs.filter((c) => c.tax_type === "state");

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Payroll</MonoLabel>
            <DisplayHeading size="md">Tax setup</DisplayHeading>
            <CommandBandLede>
              Configure federal and state tax withholding for payroll.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>
      <OperationalColumn>
        <Tabs className="space-y-6" defaultValue="federal">
          <TabsList>
            <TabsTrigger value="federal">
              <DollarSign className="h-4 w-4 mr-2" />
              Federal
            </TabsTrigger>
            <TabsTrigger value="fica">
              <Shield className="h-4 w-4 mr-2" />
              FICA
            </TabsTrigger>
            <TabsTrigger value="state">
              <Settings className="h-4 w-4 mr-2" />
              State
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Calculator className="h-4 w-4 mr-2" />
              Tax Preview
            </TabsTrigger>
          </TabsList>

          {/* Federal Tab */}
          <TabsContent className="space-y-6" value="federal">
            <Card tone="canvas">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-foreground">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Federal Income Tax</CardTitle>
                      <CardDescription>
                        US Federal income tax withholding brackets
                      </CardDescription>
                    </div>
                  </div>
                  {federalConfig && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={federalConfig.is_active}
                        onCheckedChange={(checked) =>
                          handleToggleActive(federalConfig.id, !!checked)
                        }
                      />
                      <Label className="text-sm">Active</Label>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {brackets && (
                  <div className="p-3 bg-muted/20 rounded-lg border border-hairline">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span>
                        Tax Year {brackets.taxYear} — Brackets &amp; Standard
                        Deductions
                      </span>
                    </div>
                  </div>
                )}

                {/* Single Brackets */}
                <div className="space-y-3">
                  <h3 className="font-medium">Single Filers</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rate</TableHead>
                        <TableHead>Taxable Income Range</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(brackets?.federalBrackets.single || []).map((b, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            <Badge variant="outline">
                              {formatPercent(b.rate)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatBracketRange(b)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {brackets && (
                    <p className="text-sm text-muted-foreground">
                      Standard Deduction:{" "}
                      {formatCurrency(brackets.standardDeductions.single)}
                    </p>
                  )}
                </div>

                {/* Married Brackets */}
                <div className="space-y-3">
                  <h3 className="font-medium">Married Filing Jointly</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rate</TableHead>
                        <TableHead>Taxable Income Range</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(brackets?.federalBrackets.married || []).map((b, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            <Badge variant="outline">
                              {formatPercent(b.rate)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatBracketRange(b)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {brackets && (
                    <p className="text-sm text-muted-foreground">
                      Standard Deduction:{" "}
                      {formatCurrency(brackets.standardDeductions.married)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FICA Tab */}
          <TabsContent className="space-y-6" value="fica">
            <Card tone="canvas">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-foreground">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>FICA Taxes</CardTitle>
                    <CardDescription>
                      Social Security and Medicare withholding
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-dashed" tone="canvas">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Social Security (OASDI)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Employee Rate
                        </span>
                        <span className="font-medium">
                          {brackets
                            ? formatPercent(brackets.ficaRates.socialSecurityRate)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Employer Rate
                        </span>
                        <span className="font-medium">
                          {brackets
                            ? formatPercent(brackets.ficaRates.socialSecurityRate)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Wage Base (Annual)
                        </span>
                        <span className="font-medium">
                          {brackets
                            ? formatCurrency(
                                brackets.ficaRates.socialSecurityWageBase
                              )
                            : "—"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        No SS tax on wages above the wage base.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed" tone="canvas">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Medicare</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Employee Rate
                        </span>
                        <span className="font-medium">
                          {brackets
                            ? formatPercent(brackets.ficaRates.medicareRate)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Employer Rate
                        </span>
                        <span className="font-medium">
                          {brackets
                            ? formatPercent(brackets.ficaRates.medicareRate)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Additional Rate (High Earners)
                        </span>
                        <span className="font-medium">
                          {brackets
                            ? formatPercent(
                                brackets.ficaRates.medicareAdditionalRate
                              )
                            : "—"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        No wage base limit — applies to all earnings.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* State Tab */}
          <TabsContent className="space-y-6" value="state">
            <Card tone="canvas">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-foreground">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>State Income Tax</CardTitle>
                      <CardDescription>
                        State income tax withholding by jurisdiction
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowAddState(true)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add State
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stateConfigs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>No state tax configurations added.</p>
                    <p className="text-sm">
                      Add states where you have employees to withhold state income
                      tax.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>State</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stateConfigs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">
                            {config.state_code}
                            {NO_STATE_TAX.includes(config.state_code || "") && (
                              <Badge className="ml-2" variant="secondary">
                                No Income Tax
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={config.is_active ? "default" : "secondary"}
                            >
                              {config.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                onClick={() =>
                                  handleToggleActive(config.id, !config.is_active)
                                }
                                size="sm"
                                variant="ghost"
                              >
                                {config.is_active ? "Disable" : "Enable"}
                              </Button>
                              <Button
                                className="h-8 w-8 text-red-500"
                                onClick={() => confirmDeleteStateTax(config)}
                                size="icon"
                                variant="ghost"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {brackets && (
                  <div className="mt-6 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Supported jurisdictions:</strong>{" "}
                      {brackets.supportedJurisdictions.join(", ")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Preview Tab */}
          <TabsContent className="space-y-6" value="preview">
            <Card tone="canvas">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-foreground">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Tax Withholding Preview</CardTitle>
                    <CardDescription>
                      Estimate employee tax withholding for a given salary
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Annual Gross Income</Label>
                    <Input
                      min="0"
                      onChange={(e) => setPreviewIncome(e.target.value)}
                      placeholder="60000"
                      step="1000"
                      type="number"
                      value={previewIncome}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Filing Status</Label>
                    <Select
                      onValueChange={setPreviewStatus}
                      value={previewStatus}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">
                          Married Filing Jointly
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select onValueChange={setPreviewState} value={previewState}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}{" "}
                            {NO_STATE_TAX.includes(s) ? "(No Income Tax)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button disabled={previewLoading} onClick={runTaxPreview}>
                  {previewLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  Calculate Withholding
                </Button>

                {previewResult && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="border-dashed" tone="soft-stone">
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">
                            Gross Annual
                          </p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(previewResult.grossAnnualIncome)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="border-dashed" tone="soft-stone">
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">
                            Total Annual Tax
                          </p>
                          <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(previewResult.totalAnnualTax)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="border-dashed" tone="soft-stone">
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">
                            Effective Rate
                          </p>
                          <p className="text-2xl font-bold">
                            {previewResult.effectiveRate.toFixed(1)}%
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card tone="canvas">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Biweekly Withholding Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tax Type</TableHead>
                              <TableHead className="text-right">
                                Biweekly Amount
                              </TableHead>
                              <TableHead className="text-right">
                                Annual Amount
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewResult.biweeklyWithholding.map((w, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium capitalize">
                                  {w.type.replace("_", " ")}
                                  {w.jurisdiction ? ` (${w.jurisdiction})` : ""}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(w.amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(w.annualized)}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-bold">
                              <TableCell>Total</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(
                                  previewResult.biweeklyWithholding.reduce(
                                    (s, w) => s + w.amount,
                                    0
                                  )
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(previewResult.totalAnnualTax)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Employee W-4 Note */}
        <Card className="border border-hairline bg-muted/20" tone="canvas">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">
                  Employee W-4 Required
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Each employee&apos;s filing status and allowances are configured
                  in their profile. Tax withholding calculations use employee W-4
                  information during payroll processing. The payroll engine
                  automatically computes federal, state, and FICA withholdings per
                  pay period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add State Dialog */}
        {showAddState && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-full max-w-md space-y-4">
              <h3 className="text-lg font-semibold">Add State Tax</h3>
              <div className="space-y-2">
                <Label>Select State</Label>
                <Select onValueChange={setSelectedState} value={selectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a state..." />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.filter(
                      (s) => !stateConfigs.find((c) => c.state_code === s)
                    ).map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}{" "}
                        {NO_STATE_TAX.includes(state) ? "(No Income Tax)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setShowAddState(false)} variant="outline">
                  Cancel
                </Button>
                <Button disabled={!selectedState} onClick={handleAddStateTax}>
                  Add State
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Deactivate Confirmation Dialog */}
        <AlertDialog
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setTaxConfigToDelete(null);
          }}
          open={deleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Tax Configuration</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate the{" "}
                <strong>{taxConfigToDelete?.name}</strong> state tax
                configuration? This will set it to inactive and remove it from
                your active withholdings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                onClick={() => {
                  if (taxConfigToDelete) {
                    handleDeleteStateTax(taxConfigToDelete.id);
                  }
                }}
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </OperationalColumn>
    </PageCanvas>
  );
}
