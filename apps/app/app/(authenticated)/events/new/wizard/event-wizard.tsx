"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  Loader2Icon,
  SaveIcon,
} from "lucide-react";
import type { EventDraftSnapshot } from "../../actions";
import { BudgetStep } from "./steps/budget-step";
import { DetailsStep } from "./steps/details-step";
import { LogisticsStep } from "./steps/logistics-step";
import { MenuStep } from "./steps/menu-step";
import { ReviewStep } from "./steps/review-step";
import { StaffingStep } from "./steps/staffing-step";
import { WIZARD_STEPS } from "./types";
import { useEventWizard } from "./use-event-wizard";
import { WizardProgressBar } from "./wizard-progress-bar";

interface EventWizardProps {
  initialEventId?: string;
  initialSnapshot?: EventDraftSnapshot | null;
}

export function EventWizard({
  initialEventId,
  initialSnapshot,
}: EventWizardProps) {
  const wizard = useEventWizard({ initialEventId, initialSnapshot });
  const isReviewStep = wizard.currentStep === WIZARD_STEPS.length - 1;
  const isFirstStep = wizard.currentStep === 0;

  const renderStep = () => {
    switch (WIZARD_STEPS[wizard.currentStep]?.id) {
      case "details":
        return <DetailsStep data={wizard.data} setField={wizard.setField} />;
      case "menu":
        return (
          <MenuStep
            data={wizard.data}
            toggleArrayItem={wizard.toggleArrayItem}
          />
        );
      case "budget":
        return <BudgetStep data={wizard.data} setField={wizard.setField} />;
      case "staffing":
        return <StaffingStep data={wizard.data} setField={wizard.setField} />;
      case "logistics":
        return <LogisticsStep data={wizard.data} setField={wizard.setField} />;
      case "review":
        return (
          <ReviewStep
            completionPercent={wizard.completionPercent}
            data={wizard.data}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Resume / draft banner */}
      {wizard.draftId && (
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1.5">
            <SaveIcon className="size-3.5" />
            Draft auto-saved
            {wizard.isSaving ? " (saving…)" : ""}
          </span>
          <span>{wizard.completionPercent}% complete</span>
        </div>
      )}

      {wizard.isResuming ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
          <Loader2Icon className="size-4 animate-spin" />
          Resuming your draft…
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <WizardProgressBar
            completedSteps={Math.floor(wizard.completionPercent / 20)}
            currentStep={wizard.currentStep}
            onStepClick={wizard.goToStep}
            steps={WIZARD_STEPS}
          />

          <Card tone="canvas">
            <CardContent className="p-6 md:p-8">
              <div
                className="fade-in animate-in duration-300"
                key={wizard.currentStep}
              >
                {renderStep()}
              </div>

              {wizard.error && (
                <div className="mt-5 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive text-sm">
                  {wizard.error}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between border-border border-t pt-6">
                <div className="flex items-center gap-2">
                  <Button
                    disabled={isFirstStep || wizard.isSaving}
                    onClick={wizard.goBack}
                    size="sm"
                    variant="ghost"
                  >
                    <ArrowLeftIcon className="size-4" />
                    Back
                  </Button>
                  <Button
                    disabled={wizard.isSaving || wizard.isFinalizing}
                    onClick={wizard.saveAndExit}
                    size="sm"
                    variant="ghost"
                  >
                    Save & exit
                  </Button>
                </div>

                {isReviewStep ? (
                  <Button
                    disabled={
                      wizard.isFinalizing || wizard.isSaving || !wizard.draftId
                    }
                    onClick={wizard.submitFinal}
                  >
                    {wizard.isFinalizing ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Confirming…
                      </>
                    ) : (
                      <>
                        <CheckIcon className="size-4" />
                        Confirm event
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    disabled={
                      !wizard.canProceed ||
                      wizard.isSaving ||
                      wizard.isFinalizing
                    }
                    onClick={wizard.submitAndAdvance}
                  >
                    {wizard.isSaving ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRightIcon className="size-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-muted-foreground text-xs">
            Each step saves a governed draft. You can leave and come back — your
            progress is preserved.
          </p>
        </div>
      )}
    </div>
  );
}
