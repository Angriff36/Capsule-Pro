import { cn } from "@repo/design-system/lib/utils";
import type * as React from "react";

interface FieldProps {
  children: React.ReactNode;
  className?: string;
  hint?: string;
  htmlFor?: string;
  label: string;
  required?: boolean;
}

/** Labelled field row used across all wizard steps. */
export function Field({
  children,
  className,
  hint,
  htmlFor,
  label,
  required,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="font-medium text-sm" htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <span className="font-normal text-muted-foreground text-xs">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

interface StepHeaderProps {
  description: string;
  eyebrow: string;
  title: string;
}

export function StepHeader({ description, eyebrow, title }: StepHeaderProps) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {eyebrow}
      </p>
      <h2 className="font-semibold text-foreground text-xl tracking-tight">
        {title}
      </h2>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
