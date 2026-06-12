import { Check } from "lucide-react";
import type { WizardStep } from "../../types/wizard";

interface ProgressBarProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  steps: WizardStep[];
}

export default function ProgressBar({
  steps,
  currentStep,
  onStepClick,
}: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="relative hidden items-center justify-between md:flex">
        <div className="absolute top-4 right-0 left-0 h-px bg-stone-200" />
        <div
          className="absolute top-4 left-0 h-px bg-stone-800 transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <button
              className={`relative z-10 flex flex-col items-center gap-2 ${index <= currentStep ? "cursor-pointer" : "cursor-default"}
              `}
              key={step.id}
              onClick={() => index <= currentStep && onStepClick(index)}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full font-medium text-xs transition-all duration-300 ${
                  isCompleted
                    ? "bg-stone-800 text-white"
                    : isCurrent
                      ? "bg-stone-800 text-white ring-4 ring-stone-200"
                      : "border border-stone-200 bg-stone-100 text-stone-400"
                }
                `}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <span
                className={`whitespace-nowrap text-[10px] uppercase tracking-wide ${isCurrent ? "font-semibold text-stone-800" : isCompleted ? "text-stone-500" : "text-stone-300"}
                `}
              >
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-2 md:hidden">
        <span className="text-stone-400 text-xs uppercase tracking-wider">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="font-medium text-stone-700 text-xs">
          {steps[currentStep].title}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100 md:hidden">
        <div
          className="h-full rounded-full bg-stone-800 transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
