"use client";

import { cn } from "@repo/design-system/lib/utils";
import { Check, ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Progress } from "../ui/progress";

/**
 * OnboardingWizard - A step-by-step interactive wizard for new users
 *
 * Features:
 * - Progress indicator showing current step
 * - Animated transitions between steps
 * - Clear navigation (Back, Next, Skip)
 * - Optional action button per step
 * - Keyboard navigation support
 */

export interface WizardStep {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  icon?: React.ReactNode;
  id: string;
  illustration?: React.ReactNode;
  skipable?: boolean;
  title: string;
}

interface OnboardingWizardProps {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  showProgress?: boolean;
  showSkip?: boolean;
  startStep?: number;
  steps: WizardStep[];
}

export function OnboardingWizard({
  isOpen,
  onClose,
  onComplete,
  steps,
  startStep = 0,
  showProgress = true,
  showSkip = true,
  className,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(startStep);
  const [direction, setDirection] = React.useState<"forward" | "backward">(
    "forward"
  );
  const [isAnimating, setIsAnimating] = React.useState(false);

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
      onClose();
    } else {
      setDirection("forward");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setDirection("backward");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleSkip = () => {
    onComplete?.();
    onClose();
  };

  const handleStepClick = (index: number) => {
    if (index !== currentStep && !isAnimating) {
      setDirection(index > currentStep ? "forward" : "backward");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(index);
        setIsAnimating(false);
      }, 150);
    }
  };

  React.useEffect(() => {
    setCurrentStep(startStep);
  }, [startStep, isOpen]);

  if (!currentStepData) {
    return null;
  }

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0 sm:max-w-[600px]",
          "[&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4",
          className
        )}
        showCloseButton
      >
        {/* Progress Bar */}
        {showProgress && (
          <div className="px-6 pt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-muted-foreground text-sm">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-muted-foreground text-sm">
                {Math.round(progress)}% complete
              </span>
            </div>
            <Progress className="h-2" value={progress} />
          </div>
        )}

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 px-6 pt-6">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <React.Fragment key={step.id}>
                <button
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-full transition-all duration-200",
                    "size-8 font-medium text-sm",
                    isCurrent && "scale-110 bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/20 text-primary",
                    !(isCurrent || isCompleted) &&
                      "bg-muted text-muted-foreground"
                  )}
                  disabled={isAnimating}
                  onClick={() => handleStepClick(index)}
                  type="button"
                >
                  {isCompleted ? (
                    <Check className="size-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-8 transition-colors duration-200",
                      index < currentStep ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <div
          className={cn(
            "px-6 py-6 transition-all duration-300",
            isAnimating &&
              direction === "forward" &&
              "-translate-x-4 opacity-0",
            isAnimating && direction === "backward" && "translate-x-4 opacity-0"
          )}
        >
          <DialogHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              {currentStepData.illustration ||
                (currentStepData.icon && (
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {currentStepData.icon}
                  </div>
                ))}
            </div>
            <DialogTitle className="text-2xl">
              {currentStepData.title}
            </DialogTitle>
            <DialogDescription className="text-base">
              {currentStepData.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Footer */}
        <DialogFooter className="flex-col gap-3 px-6 pb-6 sm:flex-row sm:justify-between">
          <div className="flex w-full gap-2 sm:w-auto">
            {!isFirstStep && (
              <Button
                className="w-full sm:w-auto"
                disabled={isAnimating}
                onClick={handleBack}
                type="button"
                variant="outline"
              >
                Back
              </Button>
            )}
            {showSkip && (currentStepData.skipable ?? true) && (
              <Button
                className="w-full sm:w-auto"
                disabled={isAnimating}
                onClick={handleSkip}
                type="button"
                variant="ghost"
              >
                Skip tour
              </Button>
            )}
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            {currentStepData.actionHref ? (
              <Button
                asChild
                className="w-full sm:w-auto"
                disabled={isAnimating}
                onClick={handleNext}
                type="button"
              >
                <a href={currentStepData.actionHref}>
                  {currentStepData.actionLabel || "Continue"}
                  <ChevronRight className="size-4" />
                </a>
              </Button>
            ) : (
              <Button
                className="w-full sm:w-auto"
                disabled={isAnimating}
                onClick={handleNext}
                type="button"
              >
                {isLastStep
                  ? "Get started"
                  : currentStepData.actionLabel || "Continue"}
                {!isLastStep && <ChevronRight className="size-4" />}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * InlineWizard - A compact inline version of the wizard
 * for use directly in empty states
 */
interface InlineWizardProps {
  className?: string;
  steps: Omit<WizardStep, "skipable">[];
}

export function InlineWizard({ steps, className }: InlineWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [direction, setDirection] = React.useState<"forward" | "backward">(
    "forward"
  );
  const [isAnimating, setIsAnimating] = React.useState(false);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  if (!currentStepData) {
    return null;
  }

  const handleNext = () => {
    if (!isLastStep) {
      setDirection("forward");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setDirection("backward");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  return (
    <div
      className={cn("flex flex-col items-center gap-6 text-center", className)}
    >
      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full transition-all duration-200",
                  "size-8 font-medium text-sm",
                  isCurrent && "scale-110 bg-primary text-primary-foreground",
                  isCompleted && "bg-primary/20 text-primary",
                  !(isCurrent || isCompleted) &&
                    "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8 transition-colors duration-200",
                    index < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div
        className={cn(
          "flex min-w-0 max-w-sm flex-1 flex-col items-center gap-4 transition-all duration-300",
          isAnimating && direction === "forward" && "-translate-x-4 opacity-0",
          isAnimating && direction === "backward" && "translate-x-4 opacity-0"
        )}
      >
        {currentStepData.illustration ||
          (currentStepData.icon && (
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {currentStepData.icon}
            </div>
          ))}
        <div className="space-y-2">
          <h3 className="font-medium text-lg tracking-tight">
            {currentStepData.title}
          </h3>
          <p className="text-muted-foreground text-sm/relaxed">
            {currentStepData.description}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex w-full max-w-sm gap-2">
        {!isFirstStep && (
          <Button
            className="flex-1"
            disabled={isAnimating}
            onClick={handleBack}
            type="button"
            variant="outline"
          >
            Back
          </Button>
        )}
        {currentStepData.actionHref ? (
          <Button
            asChild
            className="flex-1"
            onClick={() => {
              handleNext();
            }}
            type="button"
          >
            <a href={currentStepData.actionHref}>
              {currentStepData.actionLabel || "Continue"}
              <ChevronRight className="size-4" />
            </a>
          </Button>
        ) : (
          <Button
            className="flex-1"
            disabled={isAnimating || isLastStep}
            onClick={handleNext}
            type="button"
          >
            {currentStepData.actionLabel || "Continue"}
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * TriggerButton - A button that opens the wizard
 */
interface TriggerButtonProps {
  className?: string;
  icon?: React.ReactNode;
  label?: string;
  onClick: () => void;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
}

export function WizardTriggerButton({
  onClick,
  label = "Start guided tour",
  variant = "default",
  size = "default",
  icon,
  className,
}: TriggerButtonProps) {
  return (
    <Button
      className={className}
      onClick={onClick}
      size={size}
      variant={variant}
    >
      {icon}
      {label}
    </Button>
  );
}
