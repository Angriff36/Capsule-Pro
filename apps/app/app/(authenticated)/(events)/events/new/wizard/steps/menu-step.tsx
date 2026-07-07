"use client";

import { Input } from "@repo/design-system/components/ui/input";
import { XIcon } from "lucide-react";
import { Field, StepHeader } from "../field";
import type { EventWizardData } from "../types";

interface MenuStepProps {
  data: EventWizardData;
  toggleArrayItem: (
    field: "tags" | "accessibilityOptions",
    item: string
  ) => void;
}

const COMMON_CUISINE_TAGS = [
  "american",
  "italian",
  "mexican",
  "asian",
  "mediterranean",
  "french",
  "indian",
  "bbq",
  "seafood",
  "vegan-friendly",
];

const DIETARY_OPTIONS = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "halal",
  "kosher",
  "pescatarian",
];

export function MenuStep({ data, toggleArrayItem }: MenuStepProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        description="Capture cuisine direction and dietary needs. The full menu is built after the event exists."
        eyebrow="Step 2 of 6"
        title="Menu & dietary"
      />

      <Field
        hint="Press Enter or comma to add. Common suggestions appear below."
        htmlFor="wiz-tags-input"
        label="Cuisine tags"
      >
        <Input
          id="wiz-tags-input"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              const value = e.currentTarget.value.trim();
              if (value && !data.tags.includes(value)) {
                toggleArrayItem("tags", value);
              }
              e.currentTarget.value = "";
            }
          }}
          placeholder=" Type a cuisine and press Enter"
        />
      </Field>

      {data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((tag) => (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 font-medium text-primary text-xs"
              key={tag}
            >
              {tag}
              <button
                onClick={() => toggleArrayItem("tags", tag)}
                type="button"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {COMMON_CUISINE_TAGS.filter((tag) => !data.tags.includes(tag)).map(
          (tag) => (
            <button
              className="rounded-md border px-2 py-1 text-muted-foreground text-xs transition hover:bg-muted/70"
              key={tag}
              onClick={() => toggleArrayItem("tags", tag)}
              type="button"
            >
              + {tag}
            </button>
          )
        )}
      </div>

      <div className="space-y-3 border-border border-t pt-5">
        <Field label="Dietary & accessibility needs">
          <div className="flex flex-wrap gap-1.5">
            {DIETARY_OPTIONS.map((option) => {
              const active = data.accessibilityOptions.includes(option);
              return (
                <button
                  className={`rounded-md border px-2.5 py-1 font-medium text-xs transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/70"
                  }`}
                  key={option}
                  onClick={() =>
                    toggleArrayItem("accessibilityOptions", option)
                  }
                  type="button"
                >
                  {option}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </div>
  );
}
