/**
 * @module ContractDetailClient
 * @intent Client component for contract detail page with signature capture and actions
 * @responsibility Render contract details, manage signatures, handle document uploads, and process actions
 * @domain Events
 * @tags contracts, client-component, signatures
 * @canonical true
 */

"use client";

import type { ContractSignature, EventContract } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  HistoryIcon,
  MoreVerticalIcon,
  PenIcon,
  SendIcon,
  SignatureIcon,
  TrashIcon,
  UploadIcon,
  UserIcon,
  XCircleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { SignaturePad } from "../components/signature-pad";

interface ContractDetailClientProps {
  contract: EventContract;
  event: {
    id: string;
    title: string;
    eventDate: Date;
    eventNumber: string | null;
    venueName: string | null;
  } | null;
  client: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  signatures: ContractSignature[];
}

type ContractStatus = "draft" | "pending" | "signed" | "expired" | "cancelled";

interface HistoryEntry {
  id: string;
  type: "audit" | "signature";
  action?: string;
  performedBy?: string | null;
  performerFirstName?: string | null;
  performerLastName?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  createdAt?: Date;
  signerName?: string;
  signerEmail?: string | null;
  signedAt?: Date;
}

const statusConfig: Record<
  ContractStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: React.ReactNode;
  }
> = {
  draft: {
    label: "Draft",
    variant: "secondary",
    icon: <FileTextIcon className="size-3" />,
  },
  pending: {
    label: "Pending Signature",
    variant: "outline",
    icon: <ClockIcon className="size-3" />,
  },
  signed: {
    label: "Signed",
    variant: "default",
    icon: <CheckCircle2Icon className="size-3" />,
  },
  expired: {
    label: "Expired",
    variant: "destructive",
    icon: <XCircleIcon className="size-3" />,
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    icon: <XCircleIcon className="size-3" />,
  },
};

/**
 * Renders the appropriate document preview based on document type
 */
function DocumentPreview({
  documentUrl,
  onDownload,
}: {
  documentUrl: string;
  onDownload: () => void;
}) {
  // PDF preview using iframe
  if (documentUrl.startsWith("data:application/pdf")) {
    return (
      <div className="overflow-hidden rounded-lg border">
        <iframe
          className="h-[600px] w-full"
          src={documentUrl}
          title="Contract Document Preview"
        />
        <div className="flex justify-end border-t p-3">
          <Button onClick={onDownload} size="sm" variant="outline">
            <DownloadIcon className="mr-2 size-4" />
            Download Document
          </Button>
        </div>
      </div>
    );
  }

  // Image preview - use img for data URLs since Next Image requires dimensions
  if (documentUrl.startsWith("data:image/")) {
    return (
      <div className="overflow-hidden rounded-lg border">
        {/* biome-ignore lint/performance/noImgElement: Data URL images need img element for dynamic sizing */}
        {/* biome-ignore lint/correctness/useImageSize: Data URL images have unknown dimensions */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Contract Document"
          className="max-h-[600px] w-auto object-contain"
          src={documentUrl}
        />
        <div className="flex justify-end border-t p-3">
          <Button onClick={onDownload} size="sm" variant="outline">
            <DownloadIcon className="mr-2 size-4" />
            Download Document
          </Button>
        </div>
      </div>
    );
  }

  // Unsupported document type - show fallback
  return (
    <div className="flex aspect-[8.5/11] items-center justify-center rounded-lg border bg-muted/50">
      <div className="text-center">
        <FileTextIcon className="mx-auto mb-2 size-12 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">
          Preview not available for this document type
        </p>
        <Button
          className="mt-4"
          onClick={onDownload}
          size="sm"
          variant="outline"
        >
          <DownloadIcon className="mr-2 size-4" />
          Download Document
        </Button>
      </div>
    </div>
  );
}

export function ContractDetailClient({
  contract,
  event,
  client,
  signatures: initialSignatures,
}: ContractDetailClientProps) {
  const router = useRouter();
  const [signatures, setSignatures] = useState(initialSignatures);
  const [_isSigning, _setIsSigning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Fetch contract history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiFetch(
          `/api/events/contracts/${contract.id}/history`
        );
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error("Error fetching contract history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [contract.id]);

  const clientName =
    client?.company_name ||
    (client?.first_name || client?.last_name
      ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
      : "Unknown Client");

  const handleStatusChange = useCallback(
    async (newStatus: ContractStatus) => {
      try {
        const response = await apiFetch(
          `/api/events/contracts/${contract.id}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update contract status");
        }

        toast.success("Contract status updated");
        router.refresh();
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error("Failed to update contract status");
      }
    },
    [contract.id, router]
  );

  const handleDelete = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/events/contracts/${contract.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete contract");
      }

      toast.success("Contract deleted successfully");
      router.push(`/events/${contract.eventId}`);
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error("Failed to delete contract");
    }
  }, [contract.id, contract.eventId, router]);

  const handleSendToClient = useCallback(async () => {
    try {
      const response = await apiFetch(
        `/api/events/contracts/${contract.id}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: contract.clientId,
            contractId: contract.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send contract");
      }

      toast.success("Contract sent to client successfully");
      setShowSendDialog(false);

      // Update status to pending if it was draft
      if (contract.status === "draft") {
        await handleStatusChange("pending");
      }
    } catch (error) {
      console.error("Error sending contract:", error);
      toast.error("Failed to send contract to client");
    }
  }, [contract.id, contract.clientId, contract.status, handleStatusChange]);

  const handleDocumentUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contractId", contract.id);

      try {
        const response = await apiFetch(
          `/api/events/contracts/${contract.id}/document`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to upload document");
        }

        const _result = await response.json();
        toast.success("Document uploaded successfully");
        router.refresh();
      } catch (error) {
        console.error("Error uploading document:", error);
        toast.error("Failed to upload document");
      } finally {
        setIsUploading(false);
        setSelectedFile(null);
      }
    },
    [contract.id, router]
  );

  const handleSignatureSave = useCallback(
    async (signatureData: string, signerName: string, signerEmail?: string) => {
      try {
        const response = await apiFetch(
          `/api/events/contracts/${contract.id}/signatures`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              signatureData,
              signerName,
              signerEmail,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to save signature");
        }

        const result = await response.json();
        setSignatures((prev) => [result.signature, ...prev]);
        toast.success("Signature captured successfully");
        setShowSignatureDialog(false);

        // If all required signatures collected, update status
        if (contract.status === "pending") {
          await handleStatusChange("signed");
        }
      } catch (error) {
        console.error("Error saving signature:", error);
        toast.error("Failed to save signature");
      }
    },
    [contract.id, contract.status, handleStatusChange]
  );

  const handleDownloadDocument = useCallback(() => {
    if (contract.documentUrl) {
      window.open(contract.documentUrl, "_blank");
    } else {
      toast.error("No document available for download");
    }
  }, [contract.documentUrl]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        handleDocumentUpload(file);
      }
    },
    [handleDocumentUpload]
  );

  const statusInfo =
    statusConfig[contract.status as ContractStatus] || statusConfig.draft;

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const isExpired =
    contract.expiresAt && new Date(contract.expiresAt) < new Date();

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Status and Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge className="gap-1.5" variant={statusInfo.variant}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
            {isExpired && contract.status !== "expired" && (
              <Badge className="gap-1.5" variant="destructive">
                <AlertCircleIcon className="size-3" />
                Expired
              </Badge>
            )}
            {contract.contractNumber && (
              <Badge className="gap-1.5" variant="outline">
                <FileTextIcon className="size-3" />
                {contract.contractNumber}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  Status
                  <MoreVerticalIcon className="ml-2 size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(statusConfig).map(([status, config]) => (
                  <DropdownMenuItem
                    disabled={contract.status === status}
                    key={status}
                    onClick={() => handleStatusChange(status as ContractStatus)}
                  >
                    {config.icon}
                    <span className="ml-2">{config.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog onOpenChange={setShowSendDialog} open={showSendDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default">
                  <SendIcon className="mr-2 size-4" />
                  Send to Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Contract to Client</DialogTitle>
                  <DialogDescription>
                    This will send the contract to {clientName} for signature.
                    {client?.email &&
                      ` An email will be sent to ${client.email}.`}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    onClick={() => setShowSendDialog(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSendToClient}>
                    <SendIcon className="mr-2 size-4" />
                    Send Contract
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <TrashIcon className="mr-2 size-4" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Contract</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this contract? This action
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    onClick={() => setShowDeleteDialog(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleDelete} variant="destructive">
                    <TrashIcon className="mr-2 size-4" />
                    Delete Contract
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Contract Details */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contract Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="size-5 text-primary" />
                Contract Information
              </CardTitle>
              <CardDescription>Contract details and metadata</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1">
                <label className="text-muted-foreground text-sm font-medium">
                  Contract Title
                </label>
                <p className="font-medium">{contract.title}</p>
              </div>

              {event && (
                <>
                  <Separator />
                  <div className="grid gap-1">
                    <label className="text-muted-foreground text-sm font-medium">
                      Event
                    </label>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-muted-foreground text-sm">
                      <CalendarIcon className="mr-1 inline size-3" />
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                      }).format(event.eventDate)}
                    </p>
                  </div>
                </>
              )}

              {client && (
                <>
                  <Separator />
                  <div className="grid gap-1">
                    <label className="text-muted-foreground text-sm font-medium">
                      Client
                    </label>
                    <p className="font-medium">{clientName}</p>
                    {client.email && (
                      <p className="text-muted-foreground text-sm">
                        {client.email}
                      </p>
                    )}
                    {client.phone && (
                      <p className="text-muted-foreground text-sm">
                        {client.phone}
                      </p>
                    )}
                  </div>
                </>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1">
                  <label className="text-muted-foreground text-sm font-medium">
                    Created
                  </label>
                  <p className="text-sm">
                    {dateFormatter.format(new Date(contract.createdAt))}
                  </p>
                </div>
                <div className="grid gap-1">
                  <label className="text-muted-foreground text-sm font-medium">
                    Updated
                  </label>
                  <p className="text-sm">
                    {dateFormatter.format(new Date(contract.updatedAt))}
                  </p>
                </div>
              </div>

              {contract.expiresAt && (
                <>
                  <Separator />
                  <div className="grid gap-1">
                    <label className="text-muted-foreground text-sm font-medium">
                      Expires
                    </label>
                    <p
                      className={
                        isExpired ? "font-medium text-destructive" : "text-sm"
                      }
                    >
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                      }).format(new Date(contract.expiresAt))}
                      {isExpired && " (Expired)"}
                    </p>
                  </div>
                </>
              )}

              {contract.notes && (
                <>
                  <Separator />
                  <div className="grid gap-1">
                    <label className="text-muted-foreground text-sm font-medium">
                      Notes
                    </label>
                    <p className="text-sm whitespace-pre-wrap">
                      {contract.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Document and Signatures Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SignatureIcon className="size-5 text-primary" />
                Document & Signatures
              </CardTitle>
              <CardDescription>
                {signatures.length} signature
                {signatures.length !== 1 ? "s" : ""} captured
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Document Section */}
              <div className="grid gap-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Contract Document</p>
                    {contract.documentUrl && (
                      <p className="text-muted-foreground text-xs">
                        {contract.documentType || "PDF"} Document
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      id="document-upload"
                      onChange={handleFileSelect}
                      ref={(input) => {
                        if (input && selectedFile) {
                          input.value = "";
                        }
                      }}
                      type="file"
                    />
                    <label htmlFor="document-upload">
                      <Button
                        asChild
                        className="cursor-pointer"
                        disabled={isUploading}
                        size="sm"
                        variant="outline"
                      >
                        <span>
                          <UploadIcon className="mr-2 size-3" />
                          {isUploading ? "Uploading..." : "Upload"}
                        </span>
                      </Button>
                    </label>
                    {contract.documentUrl && (
                      <Button
                        onClick={handleDownloadDocument}
                        size="sm"
                        variant="outline"
                      >
                        <DownloadIcon className="mr-2 size-3" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
                {!contract.documentUrl && (
                  <p className="text-muted-foreground text-xs">
                    No document uploaded. Upload a PDF or Word document.
                  </p>
                )}
              </div>

              <Separator />

              {/* Signatures Section */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Signatures</p>
                  <Button
                    onClick={() => setShowSignatureDialog(true)}
                    size="sm"
                    variant="outline"
                  >
                    <PenIcon className="mr-2 size-3" />
                    Capture Signature
                  </Button>
                </div>

                {signatures.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                    <SignatureIcon className="mb-2 size-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">
                      No signatures captured yet
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {signatures.map((signature) => (
                      <div
                        className="flex items-start gap-3 rounded-lg border p-3"
                        key={signature.id}
                      >
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                          <UserIcon className="size-4 text-primary" />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">
                              {signature.signerName}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {dateFormatter.format(
                                new Date(signature.signedAt)
                              )}
                            </p>
                          </div>
                          {signature.signerEmail && (
                            <p className="text-muted-foreground text-xs">
                              {signature.signerEmail}
                            </p>
                          )}
                          {signature.ipAddress && (
                            <p className="text-muted-foreground text-xs">
                              IP: {signature.ipAddress}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Preview Section */}
        {contract.documentUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="size-5 text-primary" />
                Document Preview
              </CardTitle>
              <CardDescription>
                Preview of the contract document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentPreview
                documentUrl={contract.documentUrl}
                onDownload={handleDownloadDocument}
              />
            </CardContent>
          </Card>
        )}

        {/* Contract History Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="size-5 text-primary" />
              Contract History
            </CardTitle>
            <CardDescription>
              Status changes and activity timeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                <HistoryIcon className="mb-2 size-8 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">
                  No history recorded yet
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div
                      className="relative flex gap-4 pl-10"
                      key={`${entry.type}-${entry.id}`}
                    >
                      <div className="absolute left-2 flex size-5 items-center justify-center rounded-full bg-background">
                        {entry.type === "signature" ? (
                          <PenIcon className="size-3 text-primary" />
                        ) : (
                          <HistoryIcon className="size-3 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 rounded-lg border p-3">
                        {entry.type === "signature" ? (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">
                                Signature Captured
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {entry.signedAt &&
                                  dateFormatter.format(
                                    new Date(entry.signedAt)
                                  )}
                              </p>
                            </div>
                            <p className="text-muted-foreground text-xs">
                              Signed by {entry.signerName}
                              {entry.signerEmail && ` (${entry.signerEmail})`}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">
                                {entry.action === "update"
                                  ? "Status Changed"
                                  : entry.action === "insert"
                                    ? "Contract Created"
                                    : "Updated"}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {entry.createdAt &&
                                  dateFormatter.format(
                                    new Date(entry.createdAt)
                                  )}
                              </p>
                            </div>
                            {entry.oldValues && entry.newValues && (
                              <div className="mt-1">
                                {"status" in entry.oldValues &&
                                  "status" in entry.newValues && (
                                    <p className="text-muted-foreground text-xs">
                                      Status:{" "}
                                      <span className="capitalize">
                                        {String(entry.oldValues.status)}
                                      </span>{" "}
                                      →{" "}
                                      <span className="capitalize font-medium">
                                        {String(entry.newValues.status)}
                                      </span>
                                    </p>
                                  )}
                              </div>
                            )}
                            {entry.performerFirstName && (
                              <p className="mt-1 text-muted-foreground text-xs">
                                by {entry.performerFirstName}{" "}
                                {entry.performerLastName}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Signature Dialog */}
      <Dialog onOpenChange={setShowSignatureDialog} open={showSignatureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capture Signature</DialogTitle>
            <DialogDescription>
              Draw your signature in the box below
            </DialogDescription>
          </DialogHeader>
          <SignaturePad
            onCancel={() => setShowSignatureDialog(false)}
            onSave={handleSignatureSave}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
