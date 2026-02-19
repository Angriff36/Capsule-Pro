/**
 * @module ContractSigningClient
 * @intent Client component for public contract signing page
 * @responsibility Render contract details, handle signature capture, process signing
 * @domain Events
 * @tags contracts, client-component, signing
 * @canonical true
 */

"use client";

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
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  MapPinIcon,
  PenIcon,
  SignatureIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { SignaturePad } from "@/app/(authenticated)/events/contracts/components/signature-pad";

interface ContractSigningClientProps {
  contract: {
    id: string;
    title: string;
    status: string;
    documentUrl: string | null;
    documentType: string | null;
    notes: string | null;
    expiresAt: string | null;
    contractNumber: string | null;
  };
  event: {
    title: string;
    eventDate: string;
    venueName: string | null;
  } | null;
  client: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  signatures: Array<{
    id: string;
    signerName: string;
    signerEmail: string | null;
    signedAt: string;
  }>;
  organization: string;
  isExpired: boolean;
  signingToken: string;
}

type ContractStatus = "draft" | "pending" | "signed" | "expired" | "cancelled";

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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Component with multiple conditional renders for display
export function ContractSigningClient({
  contract,
  event,
  client,
  signatures: initialSignatures,
  organization,
  isExpired,
  signingToken,
}: ContractSigningClientProps) {
  const [signatures, setSignatures] = useState(initialSignatures);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractStatus, setContractStatus] = useState(contract.status);

  const clientName =
    client?.company_name ||
    (client?.first_name || client?.last_name
      ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
      : "Client");

  const statusInfo =
    statusConfig[contractStatus as ContractStatus] || statusConfig.draft;

  const canSign =
    !isExpired &&
    contractStatus !== "signed" &&
    contractStatus !== "cancelled" &&
    contractStatus !== "expired";

  const handleSignatureSave = useCallback(
    async (signatureData: string, signerName: string, signerEmail?: string) => {
      setIsSubmitting(true);

      try {
        const response = await fetch(
          `/api/public/contracts/${signingToken}/sign`,
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

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to sign contract");
        }

        setSignatures((prev) => [result.signature, ...prev]);
        setContractStatus("signed");
        toast.success("Contract signed successfully!");
        setShowSignatureDialog(false);
      } catch (error) {
        console.error("Error signing contract:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to sign contract"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [signingToken]
  );

  const handleDownloadDocument = useCallback(() => {
    if (contract.documentUrl) {
      window.open(contract.documentUrl, "_blank");
    } else {
      toast.error("No document available for download");
    }
  }, [contract.documentUrl]);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <FileTextIcon className="size-6 text-primary" />
            <div>
              <h1 className="font-semibold text-lg">{contract.title}</h1>
              <p className="text-muted-foreground text-sm">{organization}</p>
            </div>
          </div>
          <Badge className="gap-1.5" variant={statusInfo.variant}>
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* Expired Warning */}
        {isExpired && contract.expiresAt && (
          <Card className="mb-6 border-destructive">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircleIcon className="size-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  This contract has expired
                </p>
                <p className="text-muted-foreground text-sm">
                  This contract expired on{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "long",
                  }).format(new Date(contract.expiresAt))}
                  . Please contact us for assistance.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already Signed */}
        {contractStatus === "signed" && (
          <Card className="mb-6 border-green-500">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2Icon className="size-5 text-green-500" />
              <div>
                <p className="font-medium text-green-600">
                  Contract Signed Successfully
                </p>
                <p className="text-muted-foreground text-sm">
                  This contract has been signed. You can download a copy for
                  your records.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contract Details */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Event & Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="size-5 text-primary" />
                Contract Details
              </CardTitle>
              <CardDescription>Information about this contract</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {contract.contractNumber && (
                <div className="grid gap-1">
                  <span className="text-muted-foreground text-sm font-medium">
                    Contract Number
                  </span>
                  <p className="font-medium">{contract.contractNumber}</p>
                </div>
              )}

              {event && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <span className="text-muted-foreground text-sm font-medium">
                      Event
                    </span>
                    <p className="font-medium">{event.title}</p>
                    <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="size-3" />
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                        }).format(new Date(event.eventDate))}
                      </span>
                      {event.venueName && (
                        <span className="flex items-center gap-1">
                          <MapPinIcon className="size-3" />
                          {event.venueName}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {client && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <span className="text-muted-foreground text-sm font-medium">
                      Client
                    </span>
                    <p className="font-medium">{clientName}</p>
                    {client.email && (
                      <p className="text-muted-foreground text-sm">
                        {client.email}
                      </p>
                    )}
                  </div>
                </>
              )}

              {contract.expiresAt && (
                <>
                  <Separator />
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      Expires
                    </span>
                    <p
                      className={
                        isExpired ? "font-medium text-destructive" : "text-sm"
                      }
                    >
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "long",
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
                    <span className="text-muted-foreground text-sm font-medium">
                      Notes
                    </span>
                    <p className="text-sm whitespace-pre-wrap">
                      {contract.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Document & Signature */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SignatureIcon className="size-5 text-primary" />
                Document & Signature
              </CardTitle>
              <CardDescription>
                {signatures.length} signature
                {signatures.length !== 1 ? "s" : ""} captured
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Document Section */}
              {contract.documentUrl && (
                <div className="grid gap-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Contract Document</p>
                      <p className="text-muted-foreground text-xs">
                        {contract.documentType || "PDF"} Document
                      </p>
                    </div>
                    <Button
                      onClick={handleDownloadDocument}
                      size="sm"
                      variant="outline"
                    >
                      <DownloadIcon className="mr-2 size-3" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Signatures Section */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Signatures</p>
                  {canSign && (
                    <Button
                      onClick={() => setShowSignatureDialog(true)}
                      size="sm"
                    >
                      <PenIcon className="mr-2 size-3" />
                      Sign Contract
                    </Button>
                  )}
                </div>

                {signatures.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                    <SignatureIcon className="mb-2 size-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">
                      No signatures captured yet
                    </p>
                    {canSign && (
                      <p className="mt-1 text-muted-foreground text-xs">
                        Click "Sign Contract" to add your signature
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {signatures.map((signature) => (
                      <div
                        className="flex items-start gap-3 rounded-lg border p-3"
                        key={signature.id}
                      >
                        <div className="flex size-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                          <CheckCircle2Icon className="size-4 text-green-600 dark:text-green-400" />
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sign Button (Mobile) */}
        {canSign && (
          <div className="mt-6 flex justify-center lg:hidden">
            <Button onClick={() => setShowSignatureDialog(true)} size="lg">
              <PenIcon className="mr-2 size-4" />
              Sign Contract
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            Powered by {organization}
          </p>
        </div>
      </footer>

      {/* Signature Dialog */}
      <Dialog onOpenChange={setShowSignatureDialog} open={showSignatureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sign Contract</DialogTitle>
            <DialogDescription>
              Draw your signature in the box below to sign this contract
            </DialogDescription>
          </DialogHeader>
          <SignaturePad
            isSubmitting={isSubmitting}
            onCancel={() => setShowSignatureDialog(false)}
            onSave={handleSignatureSave}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
