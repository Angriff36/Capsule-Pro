"use client";

import type { email_templates } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2Icon, MailIcon, PlusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type EmailTemplateFilters,
  type EmailTemplateType,
  getEmailTemplates,
} from "../actions";

type EmailTemplate = email_templates;

const TEMPLATE_TYPES: { value: EmailTemplateType; label: string }[] = [
  { value: "proposal", label: "Proposal" },
  { value: "confirmation", label: "Confirmation" },
  { value: "reminder", label: "Reminder" },
  { value: "follow_up", label: "Follow-up" },
  { value: "contract", label: "Contract" },
  { value: "contact", label: "Contact" },
  { value: "custom", label: "Custom" },
];

export function EmailTemplatesClient() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();

  // State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState<EmailTemplateFilters>({
    search: searchParams.get("search") || "",
    templateType:
      (searchParams.get("templateType") as EmailTemplateType | undefined) ||
      undefined,
    isActive:
      searchParams.get("isActive") === "true"
        ? true
        : searchParams.get("isActive") === "false"
          ? false
          : undefined,
  });

  const [searchInput, setSearchInput] = useState(filters.search || "");

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmailTemplates(
        {
          ...filters,
          search: filters.search || undefined,
          templateType: filters.templateType,
          isActive: filters.isActive,
        },
        pagination.page,
        pagination.limit
      );
      setTemplates(data.data || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      toast.error("Failed to load email templates", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, pagination]);

  // Initial load
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.templateType) {
      params.set("templateType", filters.templateType);
    }
    if (filters.isActive !== undefined) {
      params.set("isActive", String(filters.isActive));
    }
    const queryString = params.toString();
    router.push(
      `/settings/email-templates${queryString ? `?${queryString}` : ""}`
    );
  }, [filters, router]);

  const handleFilterChange = (
    key: keyof EmailTemplateFilters,
    value: string
  ) => {
    if (key === "isActive") {
      setFilters((prev) => ({
        ...prev,
        isActive: value === "" ? undefined : value === "true",
      }));
    } else if (key === "templateType") {
      setFilters((prev) => ({
        ...prev,
        templateType: value === "" ? undefined : (value as EmailTemplateType),
      }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput || undefined }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters =
    filters.search || filters.templateType || filters.isActive !== undefined;

  // Table columns
  const columns: ColumnDef<EmailTemplate>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const template = row.original;
        return (
          <Link
            className="font-medium hover:underline"
            href={`/settings/email-templates/${template.id}`}
          >
            {template.name}
          </Link>
        );
      },
    },
    {
      accessorKey: "template_type",
      header: "Type",
      cell: ({ row }) => {
        const type = TEMPLATE_TYPES.find(
          (t) => t.value === row.getValue("template_type")
        );
        return (
          <Badge variant="outline">
            {type?.label || row.getValue("template_type")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => {
        const subject = row.getValue("subject") as string;
        return (
          <span className="text-muted-foreground truncate max-w-[300px] block">
            {subject}
          </span>
        );
      },
    },
    {
      accessorKey: "is_default",
      header: "Default",
      cell: ({ row }) => {
        const isDefault = row.getValue("is_default") as boolean;
        return isDefault ? (
          <Badge className="bg-primary" variant="default">
            Default
          </Badge>
        ) : null;
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
  ];

  const table = useReactTable({
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">
            Create and manage branded email templates for proposals,
            confirmations, reminders, and follow-ups.
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/email-templates/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Create Template
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <form className="flex-1 min-w-[200px]" onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Input
              className="pr-10"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search templates..."
              value={searchInput}
            />
          </div>
        </form>

        <Select
          onValueChange={(value) => handleFilterChange("templateType", value)}
          value={filters.templateType || ""}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Template Type" />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => handleFilterChange("isActive", value)}
          value={filters.isActive === undefined ? "" : String(filters.isActive)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button onClick={clearFilters} size="sm" variant="ghost">
            <XIcon className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  className="h-24 text-center"
                  colSpan={columns.length}
                >
                  <Loader2Icon className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className="cursor-pointer"
                  data-state={row.getIsSelected() && "selected"}
                  key={row.id}
                  onClick={() =>
                    router.push(`/settings/email-templates/${row.original.id}`)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="h-24 text-center"
                  colSpan={columns.length}
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <MailIcon className="h-8 w-8" />
                    <p>No email templates found</p>
                    {hasActiveFilters && (
                      <Button onClick={clearFilters} size="sm" variant="link">
                        Clear filters
                      </Button>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link href="/settings/email-templates/new">
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Create your first template
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} templates
          </p>
          <div className="flex gap-2">
            <Button
              disabled={pagination.page === 1}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <Button
              disabled={pagination.page === pagination.totalPages}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
