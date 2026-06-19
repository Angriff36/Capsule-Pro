"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { SparklesIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { EventDraftSnapshot } from "../actions";
import {
  type EventTemplate,
  EventTemplateSelector,
  getTemplateDefaults,
} from "../components/event-templates";
import { EventWizard } from "./wizard/event-wizard";

interface NewEventClientProps {
  initialEventId?: string;
  initialSnapshot?: EventDraftSnapshot | null;
}

export function NewEventClient({
  initialEventId,
  initialSnapshot,
}: NewEventClientProps) {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EventTemplate | null>(null);

  const handleSelectTemplate = (template: EventTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
  };

  const handleClearTemplate = () => {
    setSelectedTemplate(null);
  };

  // Show template selector on first load for new (non-resume) events.
  useEffect(() => {
    if (!(initialEventId || initialSnapshot)) {
      setShowTemplateSelector(true);
    }
  }, [initialEventId, initialSnapshot]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Template Banner */}
      {selectedTemplate && (
        <Card className="border-primary/50 bg-primary/5" tone="canvas">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                {selectedTemplate.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{selectedTemplate.name}</span>
                  <span className="text-muted-foreground text-xs">
                    Template applied
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowTemplateSelector(true)}
                size="sm"
                variant="ghost"
              >
                Change
              </Button>
              <Button onClick={handleClearTemplate} size="sm" variant="ghost">
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {!(selectedTemplate || initialEventId) && (
          <div className="mb-2">
            <Button
              className="gap-2"
              onClick={() => setShowTemplateSelector(true)}
              variant="outline"
            >
              <SparklesIcon className="h-4 w-4" />
              Choose a template
            </Button>
            <p className="mt-2 text-muted-foreground text-sm">
              Start from a pre-configured template, or fill in the wizard below.
              Your progress auto-saves as a draft.
            </p>
          </div>
        )}

        <EventWizard
          initialEventId={initialEventId}
          initialSnapshot={
            selectedTemplate
              ? applyTemplateToSnapshot(selectedTemplate, initialSnapshot)
              : initialSnapshot
          }
        />
      </div>

      {/* Template Selector Dialog */}
      <EventTemplateSelector
        onOpenChange={setShowTemplateSelector}
        onSelectTemplate={handleSelectTemplate}
        open={showTemplateSelector}
      />
    </div>
  );
}

/**
 * Overlay a template's defaults onto a (possibly null) resumed snapshot so the
 * wizard pre-fills cuisine tags and guest count without losing any saved
 * resume data. Only unfilled fields take the template default.
 */
function applyTemplateToSnapshot(
  template: EventTemplate,
  base: EventDraftSnapshot | null | undefined
): EventDraftSnapshot {
  const defaults = getTemplateDefaults(template);
  return {
    accessibilityOptions: base?.accessibilityOptions ?? [],
    assignedTo: base?.assignedTo ?? null,
    budget: base?.budget ?? 0,
    eventDate: base?.eventDate ?? null,
    eventFormat: base?.eventFormat ?? null,
    eventId: base?.eventId ?? "",
    eventType: base?.eventType || (defaults.eventType as string) || "catering",
    eventNumber: base?.eventNumber ?? null,
    featuredMediaUrl: base?.featuredMediaUrl ?? null,
    guestCount: base?.guestCount || (defaults.guestCount as number) || 1,
    notes: base?.notes ?? null,
    status: base?.status ?? "draft",
    tags: base?.tags?.length ? base.tags : (defaults.tags as string[]),
    ticketPrice: base?.ticketPrice ?? 0,
    ticketTier: base?.ticketTier ?? null,
    title: base?.title ?? "",
    venueAddress: base?.venueAddress ?? null,
    venueName: base?.venueName ?? null,
  };
}
