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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  FileText,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Utensils,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import { apiFetch } from "@/app/lib/api";
import * as routes from "@/app/lib/routes";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";

interface ExtractedDetail {
  id: string;
  fieldName: string;
  rawValue: string | null;
  normalizedValue: string | null;
  confidence: number;
  sourceQuote: string | null;
  status: string;
  catalogMatchType: string | null;
  createdAt: string;
}

interface Session {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  transcriptText: string | null;
}

interface Draft {
  id: string;
  tenantId: string;
  sessionId: string;
  userId: string;
  status: string;
  clientName: string | null;
  clientContactId: string | null;
  eventType: string | null;
  eventDate: string | null;
  eventTime: string | null;
  guestCount: number | null;
  guestCountMin: number | null;
  guestCountMax: number | null;
  venuePreference: string | null;
  venueId: string | null;
  serviceStyle: string | null;
  dietaryRestrictions: string | null;
  menuPreferences: Record<string, unknown> | null;
  budgetMin: number | null;
  budgetMax: number | null;
  packageIds: string[];
  addOnIds: string[];
  customItems: Record<string, unknown> | null;
  timelineNotes: string | null;
  openQuestions: string[];
  specialNotes: string | null;
  aiSummary: string | null;
  overallConfidence: number;
  convertedEventId: string | null;
  proposalId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  session: Session | null;
  extractedDetails: ExtractedDetail[];
}

interface DraftDetailClientProps {
  draft: Draft;
}

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  review: "secondary",
  converted: "default",
  expired: "destructive",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  review: "In Review",
  converted: "Converted",
  expired: "Expired",
};

const eventTypeOptions = [
  { value: "wedding", label: "Wedding" },
  { value: "corporate", label: "Corporate Event" },
  { value: "birthday", label: "Birthday Party" },
  { value: "anniversary", label: "Anniversary" },
  { value: "graduation", label: "Graduation" },
  { value: "baby_shower", label: "Baby Shower" },
  { value: "holiday_party", label: "Holiday Party" },
  { value: "reunion", label: "Reunion" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "other", label: "Other" },
];

const serviceStyleOptions = [
  { value: "plated", label: "Plated Service" },
  { value: "buffet", label: "Buffet" },
  { value: "family_style", label: "Family Style" },
  { value: "stations", label: "Food Stations" },
  { value: "cocktail", label: "Cocktail Reception" },
  { value: "grazing", label: "Grazing Tables" },
  { value: "boxed", label: "Boxed Meals" },
];

const fieldLabels: Record<string, string> = {
  clientName: "Client Name",
  eventType: "Event Type",
  eventDate: "Event Date",
  eventTime: "Event Time",
  guestCount: "Guest Count",
  venuePreference: "Venue Preference",
  serviceStyle: "Service Style",
  dietaryRestrictions: "Dietary Restrictions",
  budgetMin: "Budget (Min)",
  budgetMax: "Budget (Max)",
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return "text-green-600 bg-green-50";
  if (confidence >= 0.6) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
};

const getConfidenceIcon = (confidence: number) => {
  if (confidence >= 0.8) return CheckCircle;
  if (confidence >= 0.6) return AlertCircle;
  return AlertCircle;
};

export function DraftDetailClient({ draft }: DraftDetailClientProps) {
  const posthog = usePostHog();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [editedDraft, setEditedDraft] = useState<Draft>(draft);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Local state for form fields
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  useEffect(() => {
    posthog?.capture("call_planner:draft_viewed", {
      draft_id: draft.id,
      status: draft.status,
      confidence: draft.overallConfidence,
    });
  }, [posthog, draft.id, draft.status, draft.overallConfidence]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await apiFetch(routes.callPlannerDraft(draft.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: editedDraft.clientName,
          eventType: editedDraft.eventType,
          eventDate: editedDraft.eventDate,
          eventTime: editedDraft.eventTime,
          guestCount: editedDraft.guestCount,
          guestCountMin: editedDraft.guestCountMin,
          guestCountMax: editedDraft.guestCountMax,
          venuePreference: editedDraft.venuePreference,
          venueId: editedDraft.venueId,
          serviceStyle: editedDraft.serviceStyle,
          dietaryRestrictions: editedDraft.dietaryRestrictions,
          budgetMin: editedDraft.budgetMin,
          budgetMax: editedDraft.budgetMax,
          specialNotes: editedDraft.specialNotes,
          overallConfidence: editedDraft.overallConfidence,
        }),
      });

      if (!response.ok) throw new Error("Failed to save draft");

      const data = await response.json();
      setEditedDraft((prev) => ({
        ...prev,
        ...data.draft,
        eventDate: data.draft.eventDate
          ? new Date(data.draft.eventDate).toISOString()
          : null,
      }));

      toast.success("Draft saved successfully");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  }, [draft.id, editedDraft]);

  const handleGenerateProposal = useCallback(async () => {
    setIsGenerating(true);
    try {
      const response = await apiFetch(
        routes.callPlannerDraftGenerateProposal(draft.id),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientEmail,
            clientPhone,
            includePricing: true,
            includeUpgrades: true,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate proposal");

      const data = await response.json();

      toast.success("Proposal generated successfully", {
        description: "Magic link has been created",
      });

      setProposalDialogOpen(false);
      router.push(`/call-planner/proposals/${data.proposal.id}`);
    } catch {
      toast.error("Failed to generate proposal");
    } finally {
      setIsGenerating(false);
    }
  }, [draft.id, clientEmail, clientPhone, router]);

  const handleCopyToken = useCallback((token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/proposal-draft/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast.success("Magic link copied to clipboard");
  }, []);

  const handleConfirmDetail = useCallback(
    (fieldName: string, confirmedValue: string) => {
      setEditedDraft((prev) => ({
        ...prev,
        [fieldName]: confirmedValue,
      }));

      // Update the extracted detail status
      const detailIndex = (draftState: Draft) =>
        draftState.extractedDetails.findIndex(
          (d) => d.fieldName === fieldName
        );

      setEditedDraft((prev) => {
        const updated = { ...prev };
        const idx = detailIndex(updated);
        if (idx >= 0) {
          updated.extractedDetails = [...updated.extractedDetails];
          updated.extractedDetails[idx] = {
            ...updated.extractedDetails[idx],
            status: "confirmed",
          };
        }
        return updated;
      });
    },
    []
  );

  const canGenerateProposal =
    editedDraft.clientName &&
    editedDraft.eventType &&
    (editedDraft.guestCount ||
      editedDraft.guestCountMin ||
      editedDraft.guestCountMax);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/call-planner")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {editedDraft.clientName || "Untitled Event"}
            </h1>
            <Badge variant={statusColors[editedDraft.status] || "default"}>
              {statusLabels[editedDraft.status] || editedDraft.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Review and edit extracted event details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canGenerateProposal}>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Generate Proposal</DialogTitle>
                <DialogDescription>
                  Review the details below before generating the proposal. A
                  magic link will be created for sharing with the client.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="clientEmail">Client Email (Optional)</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="client@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="clientPhone">Client Phone (Optional)</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
                {!canGenerateProposal && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Missing Required Information</AlertTitle>
                    <AlertDescription>
                      Please fill in the client name, event type, and guest count
                      before generating a proposal.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setProposalDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateProposal}
                  disabled={!canGenerateProposal || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Proposal"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Confidence Indicator */}
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Extraction Confidence</AlertTitle>
        <AlertDescription>
          Overall confidence:{" "}
          <span
            className={`font-semibold ${getConfidenceColor(
              editedDraft.overallConfidence
            ).split(" ")[0]}`}
          >
            {Math.round(editedDraft.overallConfidence * 100)}%
          </span>
          . Review and confirm extracted details before generating the proposal.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Event Details</TabsTrigger>
          <TabsTrigger value="transcript">
            Transcript {editedDraft.session?.transcriptText && "(Attached)"}
          </TabsTrigger>
          <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
              <CardDescription>
                Review and edit the extracted event details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Name */}
              <div className="grid gap-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={editedDraft.clientName || ""}
                  onChange={(e) =>
                    setEditedDraft((prev) => ({
                      ...prev,
                      clientName: e.target.value,
                    }))
                  }
                  placeholder="Enter client name"
                />
              </div>

              {/* Event Type */}
              <div className="grid gap-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Select
                  value={editedDraft.eventType || ""}
                  onValueChange={(value) =>
                    setEditedDraft((prev) => ({
                      ...prev,
                      eventType: value,
                    }))
                  }
                >
                  <SelectTrigger id="eventType">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Date */}
              <div className="grid gap-2">
                <Label htmlFor="eventDate">Event Date</Label>
                <DatePicker
                  id="eventDate"
                  value={
                    editedDraft.eventDate
                      ? editedDraft.eventDate.slice(0, 10)
                      : undefined
                  }
                  onChange={(e) =>
                    setEditedDraft((prev) => ({
                      ...prev,
                      eventDate: e.target.value || null,
                    }))
                  }
                />
              </div>

              {/* Event Time */}
              <div className="grid gap-2">
                <Label htmlFor="eventTime">Event Time</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={editedDraft.eventTime || ""}
                  onChange={(e) =>
                    setEditedDraft((prev) => ({
                      ...prev,
                      eventTime: e.target.value,
                    }))
                  }
                />
              </div>

              <Separator />

              {/* Guest Count */}
              <div className="grid gap-4">
                <Label>Guest Count</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="guestCount" className="text-sm">
                      Exact
                    </Label>
                    <Input
                      id="guestCount"
                      type="number"
                      value={editedDraft.guestCount || ""}
                      onChange={(e) =>
                        setEditedDraft((prev) => ({
                          ...prev,
                          guestCount: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        }))
                      }
                      placeholder="100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="guestCountMin" className="text-sm">
                      Min
                    </Label>
                    <Input
                      id="guestCountMin"
                      type="number"
                      value={editedDraft.guestCountMin || ""}
                      onChange={(e) =>
                        setEditedDraft((prev) => ({
                          ...prev,
                          guestCountMin: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        }))
                      }
                      placeholder="80"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="guestCountMax" className="text-sm">
                      Max
                    </Label>
                    <Input
                      id="guestCountMax"
                      type="number"
                      value={editedDraft.guestCountMax || ""}
                      onChange={(e) =>
                        setEditedDraft((prev) => ({
                          ...prev,
                          guestCountMax: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        }))
                      }
                      placeholder="120"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Venue */}
              <div className="grid gap-2">
                <Label htmlFor="venuePreference">Venue Preference</Label>
                <Input
                  id="venuePreference"
                  value={editedDraft.venuePreference || ""}
                  onChange={(e) =>
                    setEditedDraft((prev) => ({
                      ...prev,
                      venuePreference: e.target.value,
                    }))
                  }
                  placeholder="e.g., Outdoor garden, Historic mansion"
                />
              </div>

              {/* Service Style */}
              <div className="grid gap-2">
                <Label htmlFor="serviceStyle">Service Style</Label>
                <Select
                  value={editedDraft.serviceStyle || ""}
                  onValueChange={(value) =>
                    setEditedDraft((prev) => ({
                      ...prev,
                      serviceStyle: value,
                    }))
                  }
                >
                  <SelectTrigger id="serviceStyle">
                    <SelectValue placeholder="Select service style" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceStyleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dietary Restrictions */}
              <div className="grid gap-2">
                <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                <Textarea
                  id="dietaryRestrictions"
                  value={editedDraft.dietaryRestrictions || ""}
                  onChange={(e) =>
                    setEditedDraft((prev) => ({
                      ...prev,
                      dietaryRestrictions: e.target.value,
                    }))
                  }
                  placeholder="e.g., Vegetarian options needed, Gluten-free, Nut allergies"
                  rows={3}
                />
              </div>

              <Separator />

              {/* Budget Range */}
              <div className="grid gap-4">
                <Label>Budget Range (Optional)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="budgetMin" className="text-sm">
                      Minimum
                    </Label>
                    <Input
                      id="budgetMin"
                      type="number"
                      value={editedDraft.budgetMin || ""}
                      onChange={(e) =>
                        setEditedDraft((prev) => ({
                          ...prev,
                          budgetMin: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        }))
                      }
                      placeholder="$5000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="budgetMax" className="text-sm">
                      Maximum
                    </Label>
                    <Input
                      id="budgetMax"
                      type="number"
                      value={editedDraft.budgetMax || ""}
                      onChange={(e) =>
                        setEditedDraft((prev) => ({
                          ...prev,
                          budgetMax: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        }))
                      }
                      placeholder="$15000"
                    />
                  </div>
                </div>
              </div>

              {/* Special Notes */}
              <div className="grid gap-2">
                <Label htmlFor="specialNotes">Special Notes</Label>
                <Textarea
                  id="specialNotes"
                  value={editedDraft.specialNotes || ""}
                  onChange={(e) =>
                    setEditedDraft((prev) => ({
                      ...prev,
                      specialNotes: e.target.value,
                    }))
                  }
                  placeholder="Any additional notes or special requirements..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transcript">
          <Card>
            <CardHeader>
              <CardTitle>Original Transcript</CardTitle>
              <CardDescription>
                The original call transcript used for extraction
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editedDraft.session?.transcriptText ? (
                <div className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg max-h-[600px] overflow-y-auto">
                  {editedDraft.session.transcriptText}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Transcript Available</AlertTitle>
                  <AlertDescription>
                    This draft was created without an attached transcript.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extracted" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Extracted Details</CardTitle>
              <CardDescription>
                Review the AI-extracted details with confidence scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editedDraft.extractedDetails.length > 0 ? (
                <div className="space-y-4">
                  {editedDraft.extractedDetails.map((detail) => {
                    const ConfidenceIcon = getConfidenceIcon(detail.confidence);
                    const confidenceColor = getConfidenceColor(
                      detail.confidence
                    );

                    return (
                      <div
                        key={detail.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ConfidenceIcon
                              className={`h-4 w-4 ${confidenceColor.split(" ")[0]}`}
                            />
                            <span className="font-medium">
                              {fieldLabels[detail.fieldName] || detail.fieldName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${confidenceColor}`}
                            >
                              {Math.round(detail.confidence * 100)}% confidence
                            </Badge>
                            {detail.status === "confirmed" && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Confirmed
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Extracted Value:
                            </span>
                            <span className="font-medium">
                              {detail.normalizedValue || detail.rawValue || "-"}
                            </span>
                          </div>
                          {detail.sourceQuote && (
                            <div className="bg-muted p-2 rounded text-xs">
                              <span className="text-muted-foreground">
                                Source:
                              </span>{" "}
                              &quot;{detail.sourceQuote}&quot;
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() =>
                              handleConfirmDetail(
                                detail.fieldName,
                                detail.normalizedValue || detail.rawValue || ""
                              )
                            }
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirm
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Extracted Details</AlertTitle>
                  <AlertDescription>
                    No details were extracted from the transcript.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Existing Proposal */}
      {editedDraft.proposalId && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Proposal Generated
                </CardTitle>
                <CardDescription>
                  A proposal has been generated for this draft
                </CardDescription>
              </div>
              <Button onClick={() => router.push(`/call-planner/proposals/${editedDraft.proposalId}`)}>
                <Send className="mr-2 h-4 w-4" />
                View Proposal
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
