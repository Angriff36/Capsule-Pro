"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/design-system/components/ui/accordion";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Label } from "@repo/design-system/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@repo/design-system/components/ui/radio-group";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  CalendarIcon,
  CheckCircle2Icon,
  MapPinIcon,
  SaveIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface ChecklistQuestion {
  id: string;
  type: "single-select" | "yes-no" | "yes-no-na" | "text" | "textarea";
  prompt: string;
  description?: string;
  required: boolean;
  options?: string[];
  allowNotes?: boolean;
  value: string | null;
  notes?: string;
  autoFilled?: boolean;
  autoReason?: string;
}

interface ChecklistSection {
  id: string;
  title: string;
  summary?: string;
  questions: ChecklistQuestion[];
}

interface ChecklistData {
  version?: string;
  sections?: ChecklistSection[];
}

interface ReportEditorProps {
  report: {
    id: string;
    eventId: string;
    status: string;
    completion: number;
    checklistData: Record<string, unknown>;
    autoFillScore: number | null;
    reviewNotes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  event: {
    id: string;
    eventNumber: string | null;
    title: string;
    eventDate: string;
    venueName: string | null;
    venueAddress: string | null;
    guestCount: number;
  };
}

const statusVariantMap = {
  draft: "secondary",
  in_progress: "default",
  completed: "outline",
  approved: "default",
} as const;

export function ReportEditorClient({ report, event }: ReportEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [checklistData, setChecklistData] = useState<ChecklistData>(
    report.checklistData as ChecklistData
  );
  const [status, setStatus] = useState(report.status);

  // Calculate completion
  const calculateCompletion = useCallback((data: ChecklistData) => {
    if (!data.sections) {
      return 0;
    }
    const questions = data.sections.flatMap((s) => s.questions);
    const answered = questions.filter(
      (q) => q.value !== null && q.value !== ""
    ).length;
    return Math.round((answered / questions.length) * 100);
  }, []);

  const completion = calculateCompletion(checklistData);

  // Update a question value
  const updateQuestion = useCallback(
    (
      sectionId: string,
      questionId: string,
      value: string | null,
      notes?: string
    ) => {
      setChecklistData((prev) => {
        if (!prev.sections) {
          return prev;
        }
        return {
          ...prev,
          sections: prev.sections.map((section) => {
            if (section.id !== sectionId) {
              return section;
            }
            return {
              ...section,
              questions: section.questions.map((question) => {
                if (question.id !== questionId) {
                  return question;
                }
                return {
                  ...question,
                  value,
                  notes: notes ?? question.notes,
                  autoFilled: false, // Clear auto-fill flag on manual edit
                };
              }),
            };
          }),
        };
      });
    },
    []
  );

  // Save report
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/events/reports/${report.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistData,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save report");
      }

      toast.success("Report saved successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to save report");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Mark as complete
  const handleMarkComplete = async () => {
    if (completion < 100) {
      toast.error("Please answer all questions before marking as complete");
      return;
    }
    setStatus("completed");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/events/reports/${report.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistData,
          status: "completed",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update report");
      }

      toast.success("Report marked as complete");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update report");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main checklist area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Progress bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Completion Progress</span>
              <span className="text-sm text-muted-foreground">
                {completion}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-secondary">
              <div
                className="h-3 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${completion}%` }}
              />
            </div>
            {report.autoFillScore !== null && report.autoFillScore > 0 && (
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <SparklesIcon className="h-3 w-3" />
                {report.autoFillScore} questions auto-filled from PDF
              </p>
            )}
          </CardContent>
        </Card>

        {/* Checklist sections */}
        {checklistData.sections && checklistData.sections.length > 0 ? (
          <Accordion
            defaultValue={[checklistData.sections[0]?.id]}
            type="multiple"
          >
            {checklistData.sections.map((section) => {
              const sectionQuestions = section.questions.length;
              const sectionAnswered = section.questions.filter(
                (q) => q.value !== null && q.value !== ""
              ).length;

              return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="text-left">
                        <div className="font-semibold">{section.title}</div>
                        {section.summary && (
                          <div className="text-sm text-muted-foreground">
                            {section.summary}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline">
                        {sectionAnswered}/{sectionQuestions}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4">
                      {section.questions.map((question) => (
                        <QuestionField
                          key={question.id}
                          onNotesChange={(notes) =>
                            updateQuestion(
                              section.id,
                              question.id,
                              question.value,
                              notes
                            )
                          }
                          onValueChange={(value) =>
                            updateQuestion(section.id, question.id, value)
                          }
                          question={question}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No checklist data available. Import a PDF to auto-generate the
                checklist.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Event info card */}
        <Card>
          <CardHeader>
            <CardDescription>Event Details</CardDescription>
            <CardTitle className="text-lg">{event.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {event.eventNumber && (
              <div className="text-muted-foreground">#{event.eventNumber}</div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {new Date(event.eventDate).toLocaleDateString("en-US", {
                  dateStyle: "full",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UsersIcon className="h-4 w-4" />
              <span>{event.guestCount} guests</span>
            </div>
            {event.venueName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPinIcon className="h-4 w-4" />
                <span>{event.venueName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status card */}
        <Card>
          <CardHeader>
            <CardDescription>Report Status</CardDescription>
            <div className="flex items-center gap-2">
              <Badge
                className="capitalize"
                variant={
                  statusVariantMap[status as keyof typeof statusVariantMap] ??
                  "outline"
                }
              >
                {status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button disabled={isSaving} onClick={handleSave}>
              <SaveIcon className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Progress"}
            </Button>
            {status !== "completed" && status !== "approved" && (
              <Button
                disabled={isSaving || completion < 100}
                onClick={handleMarkComplete}
                variant="outline"
              >
                <CheckCircle2Icon className="mr-2 h-4 w-4" />
                Mark Complete
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Question field component
function QuestionField({
  question,
  onValueChange,
  onNotesChange,
}: {
  question: ChecklistQuestion;
  onValueChange: (value: string | null) => void;
  onNotesChange: (notes: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="text-base font-medium">
            {question.prompt}
            {question.required && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          {question.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {question.description}
            </p>
          )}
        </div>
        {question.autoFilled && (
          <Badge className="shrink-0" variant="secondary">
            <SparklesIcon className="h-3 w-3 mr-1" />
            Auto-filled
          </Badge>
        )}
      </div>

      {/* Yes/No questions */}
      {(question.type === "yes-no" || question.type === "yes-no-na") && (
        <RadioGroup
          className="flex gap-4"
          onValueChange={onValueChange}
          value={question.value || ""}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem id={`${question.id}-yes`} value="yes" />
            <Label htmlFor={`${question.id}-yes`}>Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem id={`${question.id}-no`} value="no" />
            <Label htmlFor={`${question.id}-no`}>No</Label>
          </div>
          {question.type === "yes-no-na" && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem id={`${question.id}-na`} value="na" />
              <Label htmlFor={`${question.id}-na`}>N/A</Label>
            </div>
          )}
        </RadioGroup>
      )}

      {/* Single select questions */}
      {question.type === "single-select" && question.options && (
        <RadioGroup
          className="flex flex-wrap gap-4"
          onValueChange={onValueChange}
          value={question.value || ""}
        >
          {question.options.map((option) => (
            <div className="flex items-center space-x-2" key={option}>
              <RadioGroupItem id={`${question.id}-${option}`} value={option} />
              <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {/* Text/textarea questions */}
      {(question.type === "text" || question.type === "textarea") && (
        <Textarea
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Enter your answer..."
          rows={question.type === "textarea" ? 4 : 2}
          value={question.value || ""}
        />
      )}

      {/* Notes field */}
      {question.allowNotes && (
        <div className="pt-2">
          <Label className="text-sm text-muted-foreground">
            Notes (optional)
          </Label>
          <Textarea
            className="mt-1"
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add any additional notes..."
            rows={2}
            value={question.notes || ""}
          />
        </div>
      )}

      {/* Auto-fill reason */}
      {question.autoFilled && question.autoReason && (
        <p className="text-xs text-muted-foreground italic">
          Auto-filled because: {question.autoReason}
        </p>
      )}
    </div>
  );
}
