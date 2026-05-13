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
import { Input } from "@repo/design-system/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/design-system/components/ui/select";
import { StatusPill } from "@repo/design-system/components/blocks/page-shell";
import {
	CheckCircle,
	ChevronRight,
	CircleDot,
	Plus,
	RefreshCw,
	Search,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ContainerRecord {
	id: string;
	name: string;
	containerType: string;
	sizeDescription: string | null;
	capacityVolumeMl: string | null;
	capacityWeightG: string | null;
	capacityPortions: number | null;
	isReusable: boolean;
	isActive: boolean;
	locationId: string | null;
	createdAt: string;
	updatedAt: string;
}

interface InitialMetrics {
	total: number;
	active: number;
	inactive: number;
	reusable: number;
	disposable: number;
	byType: { containerType: string; count: number }[];
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
};

const CONTAINER_TYPES = [
	"Pan",
	"Tray",
	"Container",
	"Bowl",
	"Sheet Pan",
	"Other",
] as const;

const DEFAULT_FORM = {
	name: "",
	containerType: "",
	sizeDescription: "",
	capacityVolumeMl: "",
	capacityWeightG: "",
	capacityPortions: "",
	isReusable: true,
};

function formatCapacity(container: ContainerRecord): string {
	if (container.capacityVolumeMl) {
		return `${Number(container.capacityVolumeMl).toLocaleString()} ml`;
	}
	if (container.capacityWeightG) {
		return `${Number(container.capacityWeightG).toLocaleString()} g`;
	}
	if (container.capacityPortions) {
		return `${container.capacityPortions} portions`;
	}
	return "\u2014";
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

interface ContainersClientProps {
	initialMetrics: InitialMetrics;
}

export function ContainersClient({ initialMetrics }: ContainersClientProps) {
	const [containers, setContainers] = useState<ContainerRecord[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [totalCount, setTotalCount] = useState(initialMetrics.total);
	const [typeFilter, setTypeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<ContainerRecord | null>(null);
	const [deactivateTarget, setDeactivateTarget] =
		useState<ContainerRecord | null>(null);
	const [actioning, setActioning] = useState<string | null>(null);

	const [form, setForm] = useState(DEFAULT_FORM);

	const PAGE_SIZE = 25;

	const loadContainers = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await apiFetch("/api/kitchen/containers/list");
			if (!res.ok) throw new Error("Failed to load containers");
			const data = await res.json();
			const all: ContainerRecord[] = data.containers ?? [];

			// Client-side filtering since list endpoint has no query params
			let filtered = all;
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				filtered = filtered.filter(
					(c) =>
						c.name.toLowerCase().includes(q) ||
						c.containerType.toLowerCase().includes(q) ||
						(c.sizeDescription ?? "").toLowerCase().includes(q),
				);
			}
			if (statusFilter !== "all") {
				const isActive = statusFilter === "active";
				filtered = filtered.filter((c) => c.isActive === isActive);
			}
			if (typeFilter !== "all") {
				filtered = filtered.filter((c) => c.containerType === typeFilter);
			}

			setTotalCount(filtered.length);
			const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
			const start = (page - 1) * PAGE_SIZE;
			setContainers(filtered.slice(start, start + PAGE_SIZE));
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to load containers",
			);
		} finally {
			setIsLoading(false);
		}
	}, [page, statusFilter, typeFilter, searchQuery]);

	useEffect(() => {
		loadContainers();
	}, [loadContainers]);

	const handleSearch = () => {
		setSearchQuery(searchInput);
		setPage(1);
	};

	const resetForm = () => setForm(DEFAULT_FORM);

	const handleCreate = async () => {
		try {
			const payload: Record<string, unknown> = {
				name: form.name,
				containerType: form.containerType,
				isReusable: form.isReusable,
			};
			if (form.sizeDescription) payload.sizeDescription = form.sizeDescription;
			if (form.capacityVolumeMl)
				payload.capacityVolumeMl = Number(form.capacityVolumeMl);
			if (form.capacityWeightG)
				payload.capacityWeightG = Number(form.capacityWeightG);
			if (form.capacityPortions)
				payload.capacityPortions = Number(form.capacityPortions);

			const res = await apiFetch("/api/manifest/Container/commands/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message ?? err.error ?? "Create failed");
			}
			toast.success("Container created");
			setCreateOpen(false);
			resetForm();
			await loadContainers();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to create container",
			);
		}
	};

	const handleEdit = async () => {
		if (!editTarget) return;
		setActioning(editTarget.id);
		try {
			const payload: Record<string, unknown> = {
				id: editTarget.id,
				name: form.name,
				containerType: form.containerType,
				isReusable: form.isReusable,
			};
			if (form.sizeDescription) payload.sizeDescription = form.sizeDescription;
			else payload.sizeDescription = null;
			if (form.capacityVolumeMl)
				payload.capacityVolumeMl = Number(form.capacityVolumeMl);
			else payload.capacityVolumeMl = null;
			if (form.capacityWeightG)
				payload.capacityWeightG = Number(form.capacityWeightG);
			else payload.capacityWeightG = null;
			if (form.capacityPortions)
				payload.capacityPortions = Number(form.capacityPortions);
			else payload.capacityPortions = null;

			const res = await apiFetch("/api/manifest/Container/commands/update", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message ?? err.error ?? "Update failed");
			}
			toast.success("Container updated");
			setEditTarget(null);
			resetForm();
			await loadContainers();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to update container",
			);
		} finally {
			setActioning(null);
		}
	};

	const handleDeactivate = async () => {
		if (!deactivateTarget) return;
		setActioning(deactivateTarget.id);
		try {
			const res = await apiFetch(
				"/api/manifest/Container/commands/deactivate",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ id: deactivateTarget.id }),
				},
			);
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message ?? err.error ?? "Deactivate failed");
			}
			toast.success("Container deactivated");
			setDeactivateTarget(null);
			await loadContainers();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to deactivate container",
			);
		} finally {
			setActioning(null);
		}
	};

	const openEdit = (container: ContainerRecord) => {
		setEditTarget(container);
		setForm({
			name: container.name,
			containerType: container.containerType,
			sizeDescription: container.sizeDescription ?? "",
			capacityVolumeMl: container.capacityVolumeMl ?? "",
			capacityWeightG: container.capacityWeightG ?? "",
			capacityPortions: container.capacityPortions?.toString() ?? "",
			isReusable: container.isReusable,
		});
	};

	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
							placeholder="Search containers..."
							value={searchInput}
						/>
					</div>
					<Select
						onValueChange={(v) => {
							setTypeFilter(v);
							setPage(1);
						}}
						value={typeFilter}
					>
						<SelectTrigger className="w-40">
							<SelectValue placeholder="Type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							{CONTAINER_TYPES.map((t) => (
								<SelectItem key={t} value={t}>
									{t}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						onValueChange={(v) => {
							setStatusFilter(v);
							setPage(1);
						}}
						value={statusFilter}
					>
						<SelectTrigger className="w-36">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="inactive">Inactive</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={loadContainers} size="sm" variant="outline">
						<RefreshCw className="mr-2 size-4" />
						Refresh
					</Button>
					<Button
						onClick={() => {
							resetForm();
							setCreateOpen(true);
						}}
						size="sm"
					>
						<Plus className="mr-2 size-4" />
						New Container
					</Button>
				</div>
			</div>

			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			)}

			{!isLoading && containers.length === 0 && (
				<div className="rounded-[22px] border border-dashed border-hairline bg-canvas p-8 text-sm text-muted-foreground">
					No containers yet. Create your first container to get started.
				</div>
			)}

			{!isLoading && containers.length > 0 && (
				<div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
					<div className="grid grid-cols-[1fr_120px_130px_100px_90px_130px] gap-3 border-b border-hairline px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
						<span>Name</span>
						<span>Type</span>
						<span>Capacity</span>
						<span>Reusable</span>
						<span>Status</span>
						<span className="text-right">Actions</span>
					</div>
					{containers.map((container) => {
						const statusCfg = container.isActive
							? STATUS_CONFIG.active
							: STATUS_CONFIG.inactive;
						return (
							<div
								className="grid grid-cols-[1fr_120px_130px_100px_90px_130px] gap-3 border-b border-hairline px-5 py-4 text-sm last:border-b-0"
								key={container.id}
							>
								<div className="min-w-0">
									<p className="truncate font-medium">{container.name}</p>
									<p className="truncate text-xs text-muted-foreground">
										{container.sizeDescription ?? "No size description"}
									</p>
								</div>
								<span className="text-muted-foreground">
									{container.containerType}
								</span>
								<span className="font-mono text-muted-foreground">
									{formatCapacity(container)}
								</span>
								<span className="text-muted-foreground">
									{container.isReusable ? "Yes" : "No"}
								</span>
								<StatusPill>
									{statusCfg.icon}
									{statusCfg.label}
								</StatusPill>
								<div className="flex items-center justify-end gap-1">
									<Button
										onClick={() => openEdit(container)}
										size="sm"
										variant="outline"
									>
										<ChevronRight className="mr-1 size-3" />
										Edit
									</Button>
									{container.isActive && (
										<Button
											disabled={actioning === container.id}
											onClick={() => setDeactivateTarget(container)}
											size="sm"
											variant="ghost"
										>
											Deactivate
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
						Showing {(page - 1) * PAGE_SIZE + 1}-
						{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
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
			<Dialog
				onOpenChange={(open) => {
					if (!open) resetForm();
					setCreateOpen(open);
				}}
				open={createOpen}
			>
				<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
					<DialogHeader>
						<DialogTitle>New Container</DialogTitle>
						<DialogDescription>
							Add a new container to your kitchen inventory.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Name *</label>
							<Input
								onChange={(e) =>
									setForm((f) => ({ ...f, name: e.target.value }))
								}
								placeholder="Half Sheet Pan"
								value={form.name}
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Container Type *</label>
							<Select
								onValueChange={(v) =>
									setForm((f) => ({ ...f, containerType: v }))
								}
								value={form.containerType}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select type" />
								</SelectTrigger>
								<SelectContent>
									{CONTAINER_TYPES.map((t) => (
										<SelectItem key={t} value={t}>
											{t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Size Description</label>
							<Input
								onChange={(e) =>
									setForm((f) => ({ ...f, sizeDescription: e.target.value }))
								}
								placeholder='18" x 26" full sheet'
								value={form.sizeDescription}
							/>
						</div>
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Volume (ml)</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, capacityVolumeMl: e.target.value }))
									}
									placeholder="0"
									type="number"
									value={form.capacityVolumeMl}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Weight (g)</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, capacityWeightG: e.target.value }))
									}
									placeholder="0"
									type="number"
									value={form.capacityWeightG}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Portions</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({
											...f,
											capacityPortions: e.target.value,
										}))
									}
									placeholder="0"
									type="number"
									value={form.capacityPortions}
								/>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<input
								checked={form.isReusable}
								className="size-4 rounded border-border"
								id="create-reusable"
								onChange={(e) =>
									setForm((f) => ({ ...f, isReusable: e.target.checked }))
								}
								type="checkbox"
							/>
							<label className="text-sm font-medium" htmlFor="create-reusable">
								Reusable
							</label>
						</div>
					</div>
					<DialogFooter>
						<Button onClick={() => setCreateOpen(false)} variant="outline">
							Cancel
						</Button>
						<Button
							disabled={!form.name || !form.containerType}
							onClick={handleCreate}
						>
							Create Container
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog
				onOpenChange={(open) => {
					if (!open) {
						setEditTarget(null);
						resetForm();
					}
				}}
				open={!!editTarget}
			>
				<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Container</DialogTitle>
						<DialogDescription>
							Update container details for {editTarget?.name}.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Name *</label>
							<Input
								onChange={(e) =>
									setForm((f) => ({ ...f, name: e.target.value }))
								}
								placeholder="Half Sheet Pan"
								value={form.name}
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Container Type *</label>
							<Select
								onValueChange={(v) =>
									setForm((f) => ({ ...f, containerType: v }))
								}
								value={form.containerType}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select type" />
								</SelectTrigger>
								<SelectContent>
									{CONTAINER_TYPES.map((t) => (
										<SelectItem key={t} value={t}>
											{t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Size Description</label>
							<Input
								onChange={(e) =>
									setForm((f) => ({ ...f, sizeDescription: e.target.value }))
								}
								placeholder='18" x 26" full sheet'
								value={form.sizeDescription}
							/>
						</div>
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Volume (ml)</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, capacityVolumeMl: e.target.value }))
									}
									placeholder="0"
									type="number"
									value={form.capacityVolumeMl}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Weight (g)</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({ ...f, capacityWeightG: e.target.value }))
									}
									placeholder="0"
									type="number"
									value={form.capacityWeightG}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Portions</label>
								<Input
									onChange={(e) =>
										setForm((f) => ({
											...f,
											capacityPortions: e.target.value,
										}))
									}
									placeholder="0"
									type="number"
									value={form.capacityPortions}
								/>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<input
								checked={form.isReusable}
								className="size-4 rounded border-border"
								id="edit-reusable"
								onChange={(e) =>
									setForm((f) => ({ ...f, isReusable: e.target.checked }))
								}
								type="checkbox"
							/>
							<label className="text-sm font-medium" htmlFor="edit-reusable">
								Reusable
							</label>
						</div>
					</div>
					<DialogFooter>
						<Button
							onClick={() => {
								setEditTarget(null);
								resetForm();
							}}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={
								!form.name || !form.containerType || actioning === editTarget?.id
							}
							onClick={handleEdit}
						>
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Deactivate Confirmation */}
			<AlertDialog
				onOpenChange={(open) => {
					if (!open) setDeactivateTarget(null);
				}}
				open={!!deactivateTarget}
			>
				<AlertDialogContent className="max-w-md">
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate Container</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to deactivate{" "}
							{deactivateTarget?.name}? This will mark it as inactive but
							won&apos;t delete the record.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Active</AlertDialogCancel>
						<AlertDialogAction
							disabled={actioning === deactivateTarget?.id}
							onClick={handleDeactivate}
						>
							Deactivate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
