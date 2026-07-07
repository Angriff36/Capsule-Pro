"use client";

import { Progress } from "@repo/design-system/components/ui/progress";
import { Check } from "lucide-react";
import type { WizardStep } from "./types";

interface WizardProgressBarProps {
  completedSteps: number;
  currentStep: number;
  onStepClick: (step: number) => void;
  steps: WizardStep[];
}

function resolveDotClass(isCompleted: boolean, isCurrent: boolean): string {
  if (isCompleted) {
    return "bg-primary text-primary-foreground";
  }
  if (isCurrent) {
    return "bg-primary text-primary-foreground ring-4 ring-primary/20";
  }
  return "border border-border bg-muted text-muted-foreground";
}

function resolveLabelClass(isCurrent: boolean, isCompleted: boolean): string {
  if (isCurrent) {
    return "text-foreground font-semibold";
  }
  if (isCompleted) {
    return "text-muted-foreground";
  }
  return "text-muted-foreground/50";
}

export function WizardProgressBar({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: WizardProgressBarProps) {
  return (
    <div className="w-full">
      <div className="relative hidden items-center justify-between md:flex">
        <div className="absolute top-4 right-0 left-0 h-px bg-border" />
        <div
          className="absolute top-4 left-0 h-px bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isReachable = index <= completedSteps || index <= currentStep;
          const dotClass = resolveDotClass(isCompleted, isCurrent);
          const labelClass = resolveLabelClass(isCurrent, isCompleted);
          return (
            <button
              className={`relative z-10 flex flex-col items-center gap-2 ${isReachable ? "cursor-pointer" : "cursor-default"}`}
              key={step.id}
              onClick={() => isReachable && onStepClick(index)}
              type="button"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full font-medium text-xs transition-all duration-300 ${dotClass}`}
              >
                {isCompleted ? <Check className="size-3.5" /> : index + 1}
              </div>
              <span
                className={`whitespace-nowrap text-[10px] uppercase tracking-wide ${labelClass}`}
              >
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-1 md:hidden">
        <span className="text-muted-foreground text-xs uppercase tracking-wide">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="font-medium text-foreground text-xs">
          {steps[currentStep]?.title}
        </span>
      </div>
      <Progress
        className="mt-2 h-1.5 md:hidden"
        value={((currentStep + 1) / steps.length) * 100}
      />
    </div>
  );
}
