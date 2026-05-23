import { Check } from 'lucide-react';
import type { WizardStep } from '../../types/wizard';

interface ProgressBarProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export default function ProgressBar({ steps, currentStep, onStepClick }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="hidden md:flex items-center justify-between relative">
        <div className="absolute top-4 left-0 right-0 h-px bg-stone-200" />
        <div
          className="absolute top-4 left-0 h-px bg-stone-800 transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <button
              key={step.id}
              onClick={() => index <= currentStep && onStepClick(index)}
              className={`
                relative flex flex-col items-center gap-2 z-10
                ${index <= currentStep ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                  transition-all duration-300
                  ${isCompleted
                    ? 'bg-stone-800 text-white'
                    : isCurrent
                      ? 'bg-stone-800 text-white ring-4 ring-stone-200'
                      : 'bg-stone-100 text-stone-400 border border-stone-200'
                  }
                `}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </div>
              <span
                className={`
                  text-[10px] tracking-wide uppercase whitespace-nowrap
                  ${isCurrent ? 'text-stone-800 font-semibold' : isCompleted ? 'text-stone-500' : 'text-stone-300'}
                `}
              >
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      <div className="md:hidden flex items-center justify-between px-2">
        <span className="text-xs text-stone-400 uppercase tracking-wider">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="text-xs font-medium text-stone-700">
          {steps[currentStep].title}
        </span>
      </div>
      <div className="md:hidden mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-stone-800 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
