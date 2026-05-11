"use client";

import { apiFetch } from "@/app/lib/api";
import { Button } from "@repo/design-system/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/design-system/components/ui/select";
import { StatusPill } from "@repo/design-system/components/blocks/page-shell";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
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
import {
	CheckCircle,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PricingTier {
	id: string;
	tenantId: string;
	catalogEntryId: string;
	tierName: string;
	minQuantity: string;
	maxQuantity: string | null;
	unitCost: string;
	discountPercent: string | null;
	effectiveFrom: string | null;
	effectiveTo: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}

interface InitialMetrics {
	total: number;
	active: number;
	inactive: number;
}

const STATUS_CONFIG: Record<
	string,
	{ label: string; icon: React.ReactNode; variant: string }
> = {
	active: {
		label: "Active",
		icon: <CheckCircle className="mr-1 size-3" />,
		variant: "success",
	},
	inactive: {
		label: "Inactive",
		icon: <XCircle className="mr-1 size-3" />,
		variant: "neutral",
	},
	deleted: {
		label: "Deleted",
		icon: <Trash2 className="mr-1 size-3" />,
		variant: "error",
	},
};

interface FormState {
	catalogEntryId: string;
	tierName: string;
	minQuantity: string;
	maxQuantity: string;
	unitCost: string;
	discountPercent: string;
	effectiveFrom: string;
	effectiveTo: string;
}

const EMPTY_FORM: FormState = {
	catalogEntryId: "",
	tierName: "",
	minQuantity: "",
	maxQuantity: "",
	unitCost: "",
	discountPercent: "",
	effectiveFrom: "",
	effectiveTo: "",
};

function formatPercent(value: string | null): string {
	if (!value) return "--";
	return `${Number(value).toFixed(2)}%`;
}

function formatQuantity(value: string | null): string {
	if (!value) return "--";
	return Number(value).toLocaleString("en-US", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 3,
	});
}

function formatDate(iso: string | null): string {
	if (!iso) return "--";
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function getStatusKey(tier: PricingTier): string {
	if (tier.deletedAt) return "deleted";
	return tier.isActive ? "active" : "inactive";
}

interface PricingTiersClientProps {
	initialMetrics: InitialMetrics;
}

export function PricingTiersClient({ initialMetrics }: PricingTiersClientProps) {
	const [tiers, setTiers] = useState<PricingTier[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [totalCount, setTotalCount] = useState(initialMetrics.total);
	const [totalPages, setTotalPages] = useState(1);
	const [statusFilter, setStatusFilter] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<PricingTier | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<PricingTier | null>(null);
	const [actioning, setActioning] = useState<string | null>(null);

	const [form, setForm] = useState<FormState>(EMPTY_FORM);

	const loadTiers = useCallback(async () => {
		setIsLoading(true);
		try {
			const params = new URLSearchParams({
				page: String(page),
				limit: "25",
			});
			if (statusFilter !== "all") params.set("status", statusFilter);
			if (searchQuery) params.set("search", searchQuery);

			const res = await apiFetch(
				`/api/inventory/pricing-tiers/list?${params}`,
			);
			if (!res.ok) throw new Error("Failed to load pricing tiers");
			const data = await res.json();
			setTiers(data.data ?? []);
			setTotalCount(data.pagination?.total ?? 0);
			setTotalPages(data.pagination?.totalPages ?? 1);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to load pricing tiers",
			);
		} finally {
			setIsLoading(false);
		}
	}, [page, statusFilter, searchQuery]);

	useEffect(() => {
		loadTiers();
	}, [loadTiers]);

	const handleSearch = () => {
		setSearchQuery(searchInput);
		setPage(1);
	};

	const handleCreate = async () => {
		try {
			const payload: Record<string, unknown> = {
				catalogEntryId: form.catalogEntryId,
				tierName: form.tierName,
				minQuantity: form.minQuantity,
				unitCost: form.unitCost,
			};
			if (form.maxQuantity) payload.maxQuantity = form.maxQuantity;
			if (form.discountPercent) payload.discountPercent = form.discountPercent;
			if (form.effectiveFrom) payload.effectiveFrom = form.effectiveFrom;
			if (form.effectiveTo) payload.effectiveTo = form.effectiveTo;

			const res = await apiFetch(
				"/api/inventory/pricing-tiers/commands/create",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
			);
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error ?? "Create failed");
			}
			toast.success("Pricing tier created");
			setCreateOpen(false);
			setForm(EMPTY_FORM);
			await loadTiers();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to create pricing tier",
			);
		}
	};

	const handleEdit = async () => {
		if (!editTarget) return;
		setActioning(editTarget.id);
		try {
			const payload: Record<string, unknown> = {
				id: editTarget.id,
				tierName: form.tierName,
				minQuantity: form.minQuantity,
				unitCost: form.unitCost,
				catalogEntryId: form.catalogEntryId,
			};
			if (form.maxQuantity) payload.maxQuantity = form.maxQuantity;
			if (form.discountPercent) payload.discountPercent = form.discountPercent;
			if (form.effectiveFrom) payload.effectiveFrom = form.effectiveFrom;
			if (form.effectiveTo) payload.effectiveTo = form.effectiveTo;

			const res = await apiFetch(
				"/api/inventory/pricing-tiers/commands/update",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
			);
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error ?? "Update failed");
			}
			toast.success("Pricing tier updated");
			setEditTarget(null);
			setForm(EMPTY_FORM);
			await loadTiers();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to update pricing tier",
			);
		} finally {
			setActioning(null);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setActioning(deleteTarget.id);
		try {
			const res = await apiFetch(
				"/api/inventory/pricing-tiers/commands/soft-delete",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ id: deleteTarget.id }),
				},
			);
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error ?? "Delete failed");
			}
			toast.success("Pricing tier deleted");
			setDeleteTarget(null);
			await loadTiers();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to delete pricing tier",
			);
		} finally {
			setActioning(null);
		}
	};

	const openEdit = (tier: PricingTier) => {
		setEditTarget(tier);
		setForm({
			catalogEntryId: tier.catalogEntryId,
			tierName: tier.tierName,
			minQuantity: tier.minQuantity,
			maxQuantity: tier.maxQuantity ?? "",
			unitCost: tier.unitCost,
			discountPercent: tier.discountPercent ?? "",
			effectiveFrom: tier.effectiveFrom
				? new Date(tier.effectiveFrom).toISOString().slice(0, 10)
				: "",
			effectiveTo: tier.effectiveTo
				? new Date(tier.effectiveTo).toISOString().slice(0, 10)
				: "",
		});
	};

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							className="w-64 pl-10"
							onKeyDown={(e) => e.key === "Enter" && handleSearch()}
							onChange={(e) => setSearchInput(e.target.value)}
							placeholder="Search by tier name..."
							value={searchInput}
						/>
					</div>
					<Select
						onValueChange={(v) => {
							setStatusFilter(v);
							setPage(1);
						}}
						value={statusFilter}
					>
						<SelectTrigger className="w-40">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="inactive">Inactive</SelectItem>
							<SelectItem value="deleted">Deleted</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={loadTiers} size="sm" variant="outline">
						<RefreshCw className="mr-2 size-4" />
						Refresh
					</Button>
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<Plus className="mr-2 size-4" />
						New Tier
					</Button>
				</div>
			</div>

			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			)}

			{!isLoading && tiers.length === 0 && (
				<div className="rounded-[22px] border border-dashed border-hairline bg-canvas p-8 text-sm text-muted-foreground">
					No pricing tiers found. Create your first tier to get started.
				</div>
			)}

			{!isLoading && tiers.length > 0 && (
				<div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
					<div className="grid grid-cols-[1fr_100px_100px_110px_100px_140px_90px_110px] gap-3 border-b border-hairline px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
						<span>Tier Name</span>
						<span className="text-right">Min Qty</span>
						<span className="text-right">Max Qty</span>
						<span className="text-right">Unit Cost</span>
						<span className="text-right">Discount</span>
						<span>Effective Dates</span>
						<span>Status</span>
						<span className="text-right">Actions</span>
					</div>
					{tiers.map((tier) => {
						const statusCfg = STATUS_CONFIG[getStatusKey(tier)] ?? {
							label: "Unknown",
							icon: null,
							variant: "neutral",
						};
						return (
							<div
								className="grid grid-cols-[1fr_100px_100px_110px_100px_140px_90px_110px] gap-3 border-b border-hairline px-5 py-4 text-sm last:border-b-0"
								key={tier.id}
							>
								<div className="min-w-0">
									<p className="truncate font-medium">{tier.tierName}</p>
									<p className="truncate text-xs text-muted-foreground">
										{tier.catalogEntryId.slice(0, 8)}...
									</p>
								</div>
								<span className="text-right font-mono">
									{formatQuantity(tier.minQuantity)}
								</span>
								<span className="text-right font-mono text-muted-foreground">
									{formatQuantity(tier.maxQuantity)}
								</span>
								<span className="text-right font-mono">
									{formatCurrency(tier.unitCost)}
								</span>
								<span className="text-right font-mono text-muted-foreground">
									{formatPercent(tier.discountPercent)}
								</span>
								<span className="text-muted-foreground">
									{formatDate(tier.effectiveFrom)}
									{tier.effectiveTo ? ` - ${formatDate(tier.effectiveTo)}` : ""}
								</span>
								<StatusPill>
									{statusCfg.icon}
									{statusCfg.label}
								</StatusPill>
								<div className="flex items-center justify-end gap-1">
									<Button
										disabled={actioning === tier.id}
										onClick={() => openEdit(tier)}
										size="sm"
										variant="ghost"
									>
										<Pencil className="mr-1 size-3" />
										Edit
									</Button>
									{!tier.deletedAt && (
										<Button
											disabled={actioning === tier.id}
											onClick={() => setDeleteTarget(tier)}
											size="sm"
											variant="ghost"
										>
											<Trash2 className="mr-1 size-3" />
										</Button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}

			{!isLoading && totalPages > 1 && (
				<div className="flex items-center justify-between px-1 pt-2 text-sm">
					<span className="text-muted-foreground">
						Showing {(page - 1) * 25 + 1}-
						{Math.min(page * 25, totalCount)} of {totalCount}
					</span>
					<div className="flex gap-2">
						<Button
							disabled={page === 1}
							onClick={() => setPage(page - 1)}
							size="sm"
							variant="outline"
						>
							Previous
						</Button>
						<span className="flex items-center px-2 text-muted-foreground">
							{page} / {totalPages}
						</span>
						<Button
							disabled={page === totalPages}
							onClick={() => setPage(page + 1)}
							size="sm"
							variant="outline"
						>
							Next
						</Button>
					</div>
				</div>
			)}

			{/* Create Dialog */}
			<Dialog onOpenChange={setCreateOpen} open={createOpen}>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>New Pricing Tier</DialogTitle>
						<DialogDescription>
							Create a new volume pricing tier for a catalog entry.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Tier Name</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, tierName: e.target.value }))
									}
									placeholder="Volume Discount 1"
									value={form.tierName}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">
									Catalog Entry ID
								</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({
											...f,
											catalogEntryId: e.target.value,
										}))
									}
									placeholder="Catalog entry UUID"
									value={form.catalogEntryId}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Min Quantity</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, minQuantity: e.target.value }))
									}
									placeholder="1"
									type="number"
									step="0.001"
									value={form.minQuantity}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Max Quantity</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, maxQuantity: e.target.value }))
									}
									placeholder="Unlimited if blank"
									type="number"
									step="0.001"
									value={form.maxQuantity}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Unit Cost ($)</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, unitCost: e.target.value }))
									}
									placeholder="0.00"
									type="number"
									step="0.01"
									value={form.unitCost}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">
									Discount (%)
								</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({
											...f,
											discountPercent: e.target.value,
										}))
									}
									placeholder="Optional"
									type="number"
									step="0.01"
									value={form.discountPercent}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Effective From</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({
											...f,
											effectiveFrom: e.target.value,
										}))
									}
									type="date"
									value={form.effectiveFrom}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Effective To</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({
											...f,
											effectiveTo: e.target.value,
										}))
									}
									type="date"
									value={form.effectiveTo}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button onClick={() => setCreateOpen(false)} variant="outline">
							Cancel
						</Button>
						<Button
							disabled={!form.tierName || !form.minQuantity || !form.unitCost || !form.catalogEntryId}
							onClick={handleCreate}
						>
							Create Tier
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog
				onOpenChange={(open) => {
					if (!open) {
						setEditTarget(null);
						setForm(EMPTY_FORM);
					}
				}}
				open={!!editTarget}
			>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Pricing Tier</DialogTitle>
						<DialogDescription>
							Update pricing tier details for{" "}
							{editTarget?.tierName ?? "this tier"}.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Tier Name</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, tierName: e.target.value }))
									}
									value={form.tierName}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">
									Catalog Entry ID
								</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({
											...f,
											catalogEntryId: e.target.value,
										}))
									}
									value={form.catalogEntryId}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Min Quantity</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, minQuantity: e.target.value }))
									}
									type="number"
									step="0.001"
									value={form.minQuantity}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Max Quantity</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, maxQuantity: e.target.value }))
									}
									placeholder="Unlimited if blank"
									type="number"
									step="0.001"
									value={form.maxQuantity}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Unit Cost ($)</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, unitCost: e.target.value }))
									}
									type="number"
									step="0.01"
									value={form.unitCost}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">
									Discount (%)
								</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({
											...f,
											discountPercent: e.target.value,
										}))
									}
									type="number"
									step="0.01"
									value={form.discountPercent}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Effective From</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({
											...f,
											effectiveFrom: e.target.value,
										}))
									}
									type="date"
									value={form.effectiveFrom}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Effective To</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({
											...f,
											effectiveTo: e.target.value,
										}))
									}
									type="date"
									value={form.effectiveTo}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							onClick={() => {
								setEditTarget(null);
								setForm(EMPTY_FORM);
							}}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={
								actioning === editTarget?.id ||
								!form.tierName ||
								!form.minQuantity ||
								!form.unitCost
							}
							onClick={handleEdit}
						>
							Update Tier
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation */}
			<AlertDialog
				onOpenChange={(open) => !open && setDeleteTarget(null)}
				open={!!deleteTarget}
			>
				<AlertDialogContent className="max-w-md">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Pricing Tier</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete{" "}
							{deleteTarget?.tierName ?? "this tier"}? This is a soft delete and
							can be reversed by an administrator.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Tier</AlertDialogCancel>
						<AlertDialogAction
							disabled={actioning === deleteTarget?.id}
							onClick={handleDelete}
						>
							Delete Tier
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
