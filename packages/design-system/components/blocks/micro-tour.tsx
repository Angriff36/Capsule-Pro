"use client";

import { cn } from "@repo/design-system/lib/utils";
import { ChevronLeft, ChevronRight, HelpCircle, X } from "lucide-react";
import * as React from "react";
import { Button } from "../ui/button";

/**
 * MicroTour - Lightweight, non-blocking tooltip-based tours for empty states
 *
 * Features:
 * - 2-4 tooltip bubbles explaining section purpose
 * - Non-blocking: users can interact with the page
 * - "Don't show again" option persisted to localStorage
 * - Auto-advances or manual navigation
 * - Anchored to target elements
 */

export interface MicroTourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  icon?: React.ReactNode;
}

interface MicroTourProps {
  /** Unique identifier for this tour (used for persistence) */
  tourId: string;
  /** Steps to show in the tour (2-4 recommended) */
  steps: MicroTourStep[];
  /** Whether the tour is currently active */
  isActive: boolean;
  /** Callback when tour completes or is dismissed */
  onComplete?: () => void;
  /** Callback when "Don't show again" is clicked */
  onDontShowAgain?: () => void;
  /** Custom storage key prefix */
  storageKeyPrefix?: string;
  /** Auto-advance interval in ms (0 = disabled) */
  autoAdvanceInterval?: number;
  /** Additional class name */
  className?: string;
}

const STORAGE_KEY_PREFIX = "capsule-micro-tour";

function getStorageKey(
  tourId: string,
  prefix: string = STORAGE_KEY_PREFIX
): string {
  return `${prefix}:${tourId}:dismissed`;
}

function isTourDismissed(
  tourId: string,
  prefix: string = STORAGE_KEY_PREFIX
): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getStorageKey(tourId, prefix)) === "true";
}

function dismissTour(
  tourId: string,
  prefix: string = STORAGE_KEY_PREFIX
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(tourId, prefix), "true");
}

export function useMicroTourState(
  tourId: string,
  options?: {
    storageKeyPrefix?: string;
    onDontShowAgain?: () => void;
  }
) {
  const [isActive, setIsActive] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);

  React.useEffect(() => {
    const dismissed = isTourDismissed(tourId, options?.storageKeyPrefix);
    setIsDismissed(dismissed);
    if (!dismissed) {
      // Small delay to ensure page is rendered
      const timer = setTimeout(() => setIsActive(true), 500);
      return () => clearTimeout(timer);
    }
  }, [tourId, options?.storageKeyPrefix]);

  const handleComplete = React.useCallback(() => {
    setIsActive(false);
  }, []);

  const handleDontShowAgain = React.useCallback(() => {
    dismissTour(tourId, options?.storageKeyPrefix);
    setIsDismissed(true);
    setIsActive(false);
    options?.onDontShowAgain?.();
  }, [tourId, options]);

  const resetTour = React.useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(getStorageKey(tourId, options?.storageKeyPrefix));
    }
    setIsDismissed(false);
    setIsActive(true);
  }, [tourId, options?.storageKeyPrefix]);

  return {
    isActive,
    isDismissed,
    handleComplete,
    handleDontShowAgain,
    resetTour,
    setIsActive,
  };
}

export function MicroTour({
  tourId,
  steps,
  isActive,
  onComplete,
  onDontShowAgain,
  storageKeyPrefix = STORAGE_KEY_PREFIX,
  autoAdvanceInterval = 0,
  className,
}: MicroTourProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [placement, setPlacement] = React.useState<"top" | "bottom" | "center">(
    "center"
  );
  const tourRef = React.useRef<HTMLDivElement>(null);

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Handle visibility with animation
  React.useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
    setIsVisible(false);
  }, [isActive]);

  // Calculate position based on target element
  React.useEffect(() => {
    if (!(isActive && currentStepData.targetSelector)) {
      // Center position if no target
      setPosition({
        top: typeof window !== "undefined" ? window.innerHeight / 2 - 100 : 200,
        left: typeof window !== "undefined" ? window.innerWidth / 2 - 175 : 200,
      });
      setPlacement("center");
      return;
    }

    const updatePosition = () => {
      const target = document.querySelector(currentStepData.targetSelector!);
      if (!target) {
        setPosition({
          top:
            typeof window !== "undefined" ? window.innerHeight / 2 - 100 : 200,
          left:
            typeof window !== "undefined" ? window.innerWidth / 2 - 175 : 200,
        });
        setPlacement("center");
        return;
      }

      const rect = target.getBoundingClientRect();
      const tourWidth = 350;
      const tourHeight = 200;
      const padding = 16;

      let top = rect.top + window.scrollY;
      let left = rect.left + window.scrollX + rect.width / 2 - tourWidth / 2;
      let newPlacement: "top" | "bottom" | "center" = "bottom";

      // Determine vertical placement
      if (rect.bottom + tourHeight + padding > window.innerHeight) {
        top = rect.top + window.scrollY - tourHeight - padding;
        newPlacement = "top";
      } else {
        top = rect.bottom + window.scrollY + padding;
        newPlacement = "bottom";
      }

      // Horizontal bounds check
      if (left < padding) {
        left = padding;
      } else if (left + tourWidth > window.innerWidth - padding) {
        left = window.innerWidth - tourWidth - padding;
      }

      setPosition({ top, left });
      setPlacement(newPlacement);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isActive, currentStepData.targetSelector, currentStep]);

  // Auto-advance
  React.useEffect(() => {
    if (!isActive || autoAdvanceInterval <= 0 || isLastStep) return;

    const timer = setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }, autoAdvanceInterval);

    return () => clearTimeout(timer);
  }, [isActive, autoAdvanceInterval, isLastStep, steps.length, currentStep]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handleBack();
      } else if (e.key === "Escape") {
        handleComplete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentStep, isLastStep]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete?.();
    }, 200);
  };

  const handleDontShowAgain = () => {
    dismissTour(tourId, storageKeyPrefix);
    handleComplete();
    onDontShowAgain?.();
  };

  if (!isActive) return null;

  return (
    <div
      aria-describedby="micro-tour-description"
      aria-labelledby="micro-tour-title"
      className={cn(
        "fixed z-[9999] transition-all duration-200",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
        className
      )}
      ref={tourRef}
      role="dialog"
      style={{
        top: position.top,
        left: position.left,
        maxWidth: 350,
      }}
    >
      {/* Arrow indicator for anchored tours */}
      {placement !== "center" && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-background border-l border-t shadow-lg",
            placement === "top"
              ? "bottom-[-7px] border-b-0 border-r-0"
              : "top-[-7px] border-b border-r"
          )}
        />
      )}

      {/* Content card */}
      <div className="bg-background border rounded-lg shadow-lg p-4 space-y-3">
        {/* Header with step indicator and close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStepData.icon || (
              <HelpCircle className="size-4 text-primary" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
          <Button
            aria-label="Close tour"
            className="size-6"
            onClick={handleComplete}
            size="icon"
            variant="ghost"
          >
            <X className="size-3" />
          </Button>
        </div>

        {/* Step content */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold" id="micro-tour-title">
            {currentStepData.title}
          </h4>
          <p
            className="text-xs text-muted-foreground leading-relaxed"
            id="micro-tour-description"
          >
            {currentStepData.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleDontShowAgain}
            size="sm"
            variant="ghost"
          >
            Don't show again
          </Button>

          <div className="flex items-center gap-1">
            {!isFirstStep && (
              <Button
                className="h-7 px-2"
                onClick={handleBack}
                size="sm"
                variant="outline"
              >
                <ChevronLeft className="size-3" />
              </Button>
            )}
            <Button className="h-7 px-3" onClick={handleNext} size="sm">
              {isLastStep ? "Got it" : "Next"}
              {!isLastStep && <ChevronRight className="size-3" />}
            </Button>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {steps.map((step, index) => (
            <button
              aria-label={`Go to step ${index + 1}`}
              className={cn(
                "size-1.5 rounded-full transition-all",
                index === currentStep
                  ? "bg-primary w-4"
                  : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted-foreground/30"
              )}
              key={step.id}
              onClick={() => setCurrentStep(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * MicroTourProvider - Wraps the app to provide tour context
 */
interface MicroTourProviderProps {
  children: React.ReactNode;
}

const MicroTourContext = React.createContext<{
  startTour: (tourId: string) => void;
  endTour: (tourId: string) => void;
  resetTour: (tourId: string) => void;
  isTourActive: (tourId: string) => boolean;
} | null>(null);

export function MicroTourProvider({ children }: MicroTourProviderProps) {
  const [activeTours, setActiveTours] = React.useState<Set<string>>(new Set());

  const startTour = React.useCallback((tourId: string) => {
    setActiveTours((prev) => new Set(prev).add(tourId));
  }, []);

  const endTour = React.useCallback((tourId: string) => {
    setActiveTours((prev) => {
      const next = new Set(prev);
      next.delete(tourId);
      return next;
    });
  }, []);

  const resetTour = React.useCallback((tourId: string) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(getStorageKey(tourId));
    }
    setActiveTours((prev) => new Set(prev).add(tourId));
  }, []);

  const isTourActive = React.useCallback(
    (tourId: string) => activeTours.has(tourId),
    [activeTours]
  );

  return (
    <MicroTourContext.Provider
      value={{ startTour, endTour, resetTour, isTourActive }}
    >
      {children}
    </MicroTourContext.Provider>
  );
}

export function useMicroTour() {
  const context = React.useContext(MicroTourContext);
  if (!context) {
    throw new Error("useMicroTour must be used within a MicroTourProvider");
  }
  return context;
}

/**
 * Predefined tour configurations for common sections
 */
export const TOUR_CONFIGS = {
  events: {
    tourId: "events-empty-state",
    steps: [
      {
        id: "events-intro",
        title: "Welcome to Events",
        description:
          "This is where you manage all your catering events. Create events to track client bookings, menus, and staffing.",
      },
      {
        id: "events-create",
        title: "Create Your First Event",
        description:
          "Click the 'Create event' button to add a new event. You can set the date, client, menu, and other details.",
      },
      {
        id: "events-calendar",
        title: "Calendar View",
        description:
          "Switch between list and calendar views to see your upcoming events at a glance. Filter by status to focus on what matters.",
      },
    ],
  },
  clients: {
    tourId: "clients-empty-state",
    steps: [
      {
        id: "clients-intro",
        title: "Client Management",
        description:
          "Keep track of all your clients here. Store contact information, preferences, and event history.",
      },
      {
        id: "clients-add",
        title: "Add Your First Client",
        description:
          "Click 'Add client' to create a client profile. Include their contact details and any special requirements.",
      },
    ],
  },
  tasks: {
    tourId: "tasks-empty-state",
    steps: [
      {
        id: "tasks-intro",
        title: "Kitchen Tasks",
        description:
          "View and manage prep tasks here. Tasks are organized by priority and due date.",
      },
      {
        id: "tasks-claim",
        title: "Claim Tasks",
        description:
          "Claim available tasks to add them to your list. Complete tasks to earn points and track your progress.",
      },
    ],
  },
  inventory: {
    tourId: "inventory-empty-state",
    steps: [
      {
        id: "inventory-intro",
        title: "Inventory Management",
        description:
          "Track all your ingredients and supplies here. Monitor stock levels, costs, and reorder points.",
      },
      {
        id: "inventory-add",
        title: "Add Items",
        description:
          "Click 'Add item' to add ingredients or supplies to your inventory. Set quantities, units, and costs.",
      },
      {
        id: "inventory-track",
        title: "Track Usage",
        description:
          "As you use items in recipes, inventory automatically updates. Get alerts when stock is low.",
      },
    ],
  },
  shipments: {
    tourId: "shipments-empty-state",
    steps: [
      {
        id: "shipments-intro",
        title: "Shipments",
        description:
          "Manage incoming and outgoing shipments. Track delivery status and verify received items.",
      },
      {
        id: "shipments-create",
        title: "Create Shipments",
        description:
          "Create shipments to track orders from suppliers or deliveries to event venues.",
      },
    ],
  },
} as const;

export type TourConfigKey = keyof typeof TOUR_CONFIGS;
