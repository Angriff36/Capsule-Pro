/**
 * @module ContractDetailClient
 * @intent Client component for contract detail page with signature capture and actions
 * @responsibility Render contract details, manage signatures, handle document uploads, and process actions
 * @domain Events
 * @tags contracts, client-component, signatures
 * @canonical true
 */
"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractDetailClient = ContractDetailClient;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const separator_1 = require("@repo/design-system/components/ui/separator");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const signature_pad_1 = require("../components/signature-pad");
const statusConfig = {
  draft: {
    label: "Draft",
    variant: "secondary",
    icon: <lucide_react_1.FileTextIcon className="size-3" />,
  },
  pending: {
    label: "Pending Signature",
    variant: "outline",
    icon: <lucide_react_1.ClockIcon className="size-3" />,
  },
  signed: {
    label: "Signed",
    variant: "default",
    icon: <lucide_react_1.CheckCircle2Icon className="size-3" />,
  },
  expired: {
    label: "Expired",
    variant: "destructive",
    icon: <lucide_react_1.XCircleIcon className="size-3" />,
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    icon: <lucide_react_1.XCircleIcon className="size-3" />,
  },
};
function ContractDetailClient({
  contract,
  event,
  client,
  signatures: initialSignatures,
}) {
  const router = (0, navigation_1.useRouter)();
  const [signatures, setSignatures] = (0, react_1.useState)(initialSignatures);
  const [isSigning, setIsSigning] = (0, react_1.useState)(false);
  const [isUploading, setIsUploading] = (0, react_1.useState)(false);
  const [showSignatureDialog, setShowSignatureDialog] = (0, react_1.useState)(
    false
  );
  const [showDeleteDialog, setShowDeleteDialog] = (0, react_1.useState)(false);
  const [showSendDialog, setShowSendDialog] = (0, react_1.useState)(false);
  const [selectedFile, setSelectedFile] = (0, react_1.useState)(null);
  const clientName =
    client?.company_name ||
    (client?.first_name || client?.last_name
      ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
      : "Unknown Client");
  const handleStatusChange = (0, react_1.useCallback)(
    async (newStatus) => {
      try {
        const response = await fetch(
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
        sonner_1.toast.success("Contract status updated");
        router.refresh();
      } catch (error) {
        console.error("Error updating status:", error);
        sonner_1.toast.error("Failed to update contract status");
      }
    },
    [contract.id, router]
  );
  const handleDelete = (0, react_1.useCallback)(async () => {
    try {
      const response = await fetch(`/api/events/contracts/${contract.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete contract");
      }
      sonner_1.toast.success("Contract deleted successfully");
      router.push(`/events/${contract.eventId}`);
    } catch (error) {
      console.error("Error deleting contract:", error);
      sonner_1.toast.error("Failed to delete contract");
    }
  }, [contract.id, contract.eventId, router]);
  const handleSendToClient = (0, react_1.useCallback)(async () => {
    try {
      const response = await fetch(
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
      sonner_1.toast.success("Contract sent to client successfully");
      setShowSendDialog(false);
      // Update status to pending if it was draft
      if (contract.status === "draft") {
        await handleStatusChange("pending");
      }
    } catch (error) {
      console.error("Error sending contract:", error);
      sonner_1.toast.error("Failed to send contract to client");
    }
  }, [contract.id, contract.clientId, contract.status, handleStatusChange]);
  const handleDocumentUpload = (0, react_1.useCallback)(
    async (file) => {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contractId", contract.id);
      try {
        const response = await fetch(
          `/api/events/contracts/${contract.id}/document`,
          {
            method: "POST",
            body: formData,
          }
        );
        if (!response.ok) {
          throw new Error("Failed to upload document");
        }
        const result = await response.json();
        sonner_1.toast.success("Document uploaded successfully");
        router.refresh();
      } catch (error) {
        console.error("Error uploading document:", error);
        sonner_1.toast.error("Failed to upload document");
      } finally {
        setIsUploading(false);
        setSelectedFile(null);
      }
    },
    [contract.id, router]
  );
  const handleSignatureSave = (0, react_1.useCallback)(
    async (signatureData, signerName, signerEmail) => {
      try {
        const response = await fetch(
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
        sonner_1.toast.success("Signature captured successfully");
        setShowSignatureDialog(false);
        // If all required signatures collected, update status
        if (contract.status === "pending") {
          await handleStatusChange("signed");
        }
      } catch (error) {
        console.error("Error saving signature:", error);
        sonner_1.toast.error("Failed to save signature");
      }
    },
    [contract.id, contract.status, handleStatusChange]
  );
  const handleDownloadDocument = (0, react_1.useCallback)(() => {
    if (contract.documentUrl) {
      window.open(contract.documentUrl, "_blank");
    } else {
      sonner_1.toast.error("No document available for download");
    }
  }, [contract.documentUrl]);
  const handleFileSelect = (0, react_1.useCallback)(
    (e) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        handleDocumentUpload(file);
      }
    },
    [handleDocumentUpload]
  );
  const statusInfo = statusConfig[contract.status] || statusConfig.draft;
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
            <badge_1.Badge className="gap-1.5" variant={statusInfo.variant}>
              {statusInfo.icon}
              {statusInfo.label}
            </badge_1.Badge>
            {isExpired && contract.status !== "expired" && (
              <badge_1.Badge className="gap-1.5" variant="destructive">
                <lucide_react_1.AlertCircleIcon className="size-3" />
                Expired
              </badge_1.Badge>
            )}
            {contract.contractNumber && (
              <badge_1.Badge className="gap-1.5" variant="outline">
                <lucide_react_1.FileTextIcon className="size-3" />
                {contract.contractNumber}
              </badge_1.Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <dropdown_menu_1.DropdownMenu>
              <dropdown_menu_1.DropdownMenuTrigger asChild>
                <button_1.Button size="sm" variant="outline">
                  Status
                  <lucide_react_1.MoreVerticalIcon className="ml-2 size-4" />
                </button_1.Button>
              </dropdown_menu_1.DropdownMenuTrigger>
              <dropdown_menu_1.DropdownMenuContent align="end">
                <dropdown_menu_1.DropdownMenuLabel>
                  Change Status
                </dropdown_menu_1.DropdownMenuLabel>
                <dropdown_menu_1.DropdownMenuSeparator />
                {Object.entries(statusConfig).map(([status, config]) => (
                  <dropdown_menu_1.DropdownMenuItem
                    disabled={contract.status === status}
                    key={status}
                    onClick={() => handleStatusChange(status)}
                  >
                    {config.icon}
                    <span className="ml-2">{config.label}</span>
                  </dropdown_menu_1.DropdownMenuItem>
                ))}
              </dropdown_menu_1.DropdownMenuContent>
            </dropdown_menu_1.DropdownMenu>

            <dialog_1.Dialog
              onOpenChange={setShowSendDialog}
              open={showSendDialog}
            >
              <dialog_1.DialogTrigger asChild>
                <button_1.Button size="sm" variant="default">
                  <lucide_react_1.SendIcon className="mr-2 size-4" />
                  Send to Client
                </button_1.Button>
              </dialog_1.DialogTrigger>
              <dialog_1.DialogContent>
                <dialog_1.DialogHeader>
                  <dialog_1.DialogTitle>
                    Send Contract to Client
                  </dialog_1.DialogTitle>
                  <dialog_1.DialogDescription>
                    This will send the contract to {clientName} for signature.
                    {client?.email &&
                      ` An email will be sent to ${client.email}.`}
                  </dialog_1.DialogDescription>
                </dialog_1.DialogHeader>
                <dialog_1.DialogFooter>
                  <button_1.Button
                    onClick={() => setShowSendDialog(false)}
                    variant="outline"
                  >
                    Cancel
                  </button_1.Button>
                  <button_1.Button onClick={handleSendToClient}>
                    <lucide_react_1.SendIcon className="mr-2 size-4" />
                    Send Contract
                  </button_1.Button>
                </dialog_1.DialogFooter>
              </dialog_1.DialogContent>
            </dialog_1.Dialog>

            <dialog_1.Dialog
              onOpenChange={setShowDeleteDialog}
              open={showDeleteDialog}
            >
              <dialog_1.DialogTrigger asChild>
                <button_1.Button size="sm" variant="outline">
                  <lucide_react_1.TrashIcon className="mr-2 size-4" />
                  Delete
                </button_1.Button>
              </dialog_1.DialogTrigger>
              <dialog_1.DialogContent>
                <dialog_1.DialogHeader>
                  <dialog_1.DialogTitle>Delete Contract</dialog_1.DialogTitle>
                  <dialog_1.DialogDescription>
                    Are you sure you want to delete this contract? This action
                    cannot be undone.
                  </dialog_1.DialogDescription>
                </dialog_1.DialogHeader>
                <dialog_1.DialogFooter>
                  <button_1.Button
                    onClick={() => setShowDeleteDialog(false)}
                    variant="outline"
                  >
                    Cancel
                  </button_1.Button>
                  <button_1.Button onClick={handleDelete} variant="destructive">
                    <lucide_react_1.TrashIcon className="mr-2 size-4" />
                    Delete Contract
                  </button_1.Button>
                </dialog_1.DialogFooter>
              </dialog_1.DialogContent>
            </dialog_1.Dialog>
          </div>
        </div>

        {/* Contract Details */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contract Information Card */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center gap-2">
                <lucide_react_1.FileTextIcon className="size-5 text-primary" />
                Contract Information
              </card_1.CardTitle>
              <card_1.CardDescription>
                Contract details and metadata
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent className="grid gap-4">
              <div className="grid gap-1">
                <label className="text-muted-foreground text-sm font-medium">
                  Contract Title
                </label>
                <p className="font-medium">{contract.title}</p>
              </div>

              {event && (
                <>
                  <separator_1.Separator />
                  <div className="grid gap-1">
                    <label className="text-muted-foreground text-sm font-medium">
                      Event
                    </label>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-muted-foreground text-sm">
                      <lucide_react_1.CalendarIcon className="mr-1 inline size-3" />
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                      }).format(event.eventDate)}
                    </p>
                  </div>
                </>
              )}

              {client && (
                <>
                  <separator_1.Separator />
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

              <separator_1.Separator />

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
                  <separator_1.Separator />
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
                  <separator_1.Separator />
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
            </card_1.CardContent>
          </card_1.Card>

          {/* Document and Signatures Card */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center gap-2">
                <lucide_react_1.SignatureIcon className="size-5 text-primary" />
                Document & Signatures
              </card_1.CardTitle>
              <card_1.CardDescription>
                {signatures.length} signature
                {signatures.length !== 1 ? "s" : ""} captured
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent className="flex flex-col gap-4">
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
                      <button_1.Button
                        asChild
                        className="cursor-pointer"
                        disabled={isUploading}
                        size="sm"
                        variant="outline"
                      >
                        <span>
                          <lucide_react_1.UploadIcon className="mr-2 size-3" />
                          {isUploading ? "Uploading..." : "Upload"}
                        </span>
                      </button_1.Button>
                    </label>
                    {contract.documentUrl && (
                      <button_1.Button
                        onClick={handleDownloadDocument}
                        size="sm"
                        variant="outline"
                      >
                        <lucide_react_1.DownloadIcon className="mr-2 size-3" />
                        Download
                      </button_1.Button>
                    )}
                  </div>
                </div>
                {!contract.documentUrl && (
                  <p className="text-muted-foreground text-xs">
                    No document uploaded. Upload a PDF or Word document.
                  </p>
                )}
              </div>

              <separator_1.Separator />

              {/* Signatures Section */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Signatures</p>
                  <button_1.Button
                    onClick={() => setShowSignatureDialog(true)}
                    size="sm"
                    variant="outline"
                  >
                    <lucide_react_1.PenIcon className="mr-2 size-3" />
                    Capture Signature
                  </button_1.Button>
                </div>

                {signatures.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                    <lucide_react_1.SignatureIcon className="mb-2 size-8 text-muted-foreground/50" />
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
                          <lucide_react_1.UserIcon className="size-4 text-primary" />
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
            </card_1.CardContent>
          </card_1.Card>
        </div>

        {/* Document Preview Section */}
        {contract.documentUrl && (
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center gap-2">
                <lucide_react_1.FileTextIcon className="size-5 text-primary" />
                Document Preview
              </card_1.CardTitle>
              <card_1.CardDescription>
                Preview of the contract document
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="flex aspect-[8.5/11] items-center justify-center rounded-lg border bg-muted/50">
                <div className="text-center">
                  <lucide_react_1.FileTextIcon className="mx-auto mb-2 size-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground text-sm">
                    Document preview will be available once the document is
                    processed
                  </p>
                  <button_1.Button
                    className="mt-4"
                    onClick={handleDownloadDocument}
                    size="sm"
                    variant="outline"
                  >
                    <lucide_react_1.DownloadIcon className="mr-2 size-4" />
                    Download Document
                  </button_1.Button>
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        )}
      </div>

      {/* Signature Dialog */}
      <dialog_1.Dialog
        onOpenChange={setShowSignatureDialog}
        open={showSignatureDialog}
      >
        <dialog_1.DialogContent className="max-w-2xl">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Capture Signature</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Draw your signature in the box below
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <signature_pad_1.SignaturePad
            onCancel={() => setShowSignatureDialog(false)}
            onSave={handleSignatureSave}
          />
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </>
  );
}
