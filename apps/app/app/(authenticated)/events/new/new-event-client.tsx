"use client";

import { useState, useEffect } from "react";
import { EventForm } from "../components/event-form";
import {
  EventTemplateSelector,
  getTemplateDefaults,
  type EventTemplate,
} from "../components/event-templates";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { SparklesIcon, XIcon, UsersIcon, ClockIcon, UtensilsIcon } from "lucide-react";
import type { CreateEventState } from "../actions";
import { createEvent } from "../actions";

interface NewEventClientProps {
  orgId: string;
}

export function NewEventClient({ orgId }: NewEventClientProps) {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [templateDefaults, setTemplateDefaults] = useState<Record<string, unknown> | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleSelectTemplate = (template: EventTemplate) => {
    setSelectedTemplate(template);
    const defaults = getTemplateDefaults(template);
    setTemplateDefaults(defaults);
    // Force form re-render with new defaults
    setFormKey((prev) => prev + 1);
  };

  const handleClearTemplate = () => {
    setSelectedTemplate(null);
    setTemplateDefaults(null);
    setFormKey((prev) => prev + 1);
  };

  // Show template selector on first load for new events
  useEffect(() => {
    setShowTemplateSelector(true);
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Template Banner */}
      {selectedTemplate && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                {selectedTemplate.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{selectedTemplate.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Template Applied
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <UsersIcon className="h-3 w-3" />
                    {selectedTemplate.defaultGuestCount} guests
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {selectedTemplate.defaultDuration}h
                  </span>
                  <span className="flex items-center gap-1">
                    <UtensilsIcon className="h-3 w-3" />
                    {selectedTemplate.defaultServiceStyle}
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
                Change Template
              </Button>
              <Button
                onClick={handleClearTemplate}
                size="sm"
                variant="ghost"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Form with Template Defaults */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {!selectedTemplate && (
          <div className="mb-4">
            <Button
              onClick={() => setShowTemplateSelector(true)}
              variant="outline"
              className="gap-2"
            >
              <SparklesIcon className="h-4 w-4" />
              Choose a Template
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with a pre-configured template for common event types, or fill in the form below.
            </p>
          </div>
        )}
        
        <EventFormWithDefaults
          key={formKey}
          templateDefaults={templateDefaults}
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

// Wrapper form that accepts template defaults
function EventFormWithDefaults({
  templateDefaults,
}: {
  templateDefaults: Record<string, unknown> | null;
}) {
  // Create a wrapper action that logs the form data
  const wrappedAction = async (prevState: CreateEventState, formData: FormData) => {
    return createEvent(prevState, formData);
  };

  // Pass template defaults to pre-fill form fields
  return (
    <EventForm
      action={wrappedAction}
      submitLabel="Create event"
      templateDefaults={
        templateDefaults
          ? {
              eventType: templateDefaults.eventType as string,
              guestCount: templateDefaults.guestCount as number,
              serviceStyle: templateDefaults.serviceStyle as string,
              tags: templateDefaults.tags as string[],
              templateId: templateDefaults.templateId as string,
            }
          : null
      }
    />
  );
}
