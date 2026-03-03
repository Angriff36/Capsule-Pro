"use client";

import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { cn } from "@repo/design-system/lib/utils";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Editable Field Component — Click to edit, blur/enter to save
// ============================================================================

interface EditableFieldProps {
  /** Current value to display */
  value: string | number | null;
  /** Label shown above the field */
  label: string;
  /** Callback when value is saved */
  onSave: (value: string) => Promise<void>;
  /** Field type for input styling */
  type?: "text" | "number" | "textarea" | "date";
  /** Placeholder when value is empty */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Display formatter for the value */
  displayFormatter?: (value: string | number | null) => string;
}

export function EditableField({
  value,
  label,
  onSave,
  type = "text",
  placeholder = "Not set",
  disabled = false,
  className,
  displayFormatter,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    value != null ? String(value) : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync edit value when prop changes
  useEffect(() => {
    setEditValue(value != null ? String(value) : "");
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type !== "number") {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleStartEdit = useCallback(() => {
    if (disabled || isSaving) return;
    setIsEditing(true);
    setEditValue(value != null ? String(value) : "");
    setError(null);
  }, [disabled, isSaving, value]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value != null ? String(value) : "");
    setError(null);
  }, [value]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const newValue = editValue.trim();
    const originalValue = value != null ? String(value) : "";

    // Don't save if unchanged
    if (newValue === originalValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(newValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [editValue, isSaving, onSave, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && type !== "textarea") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel, type]
  );

  const displayValue = displayFormatter
    ? displayFormatter(value)
    : value != null
      ? String(value)
      : placeholder;

  if (isEditing) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className="flex items-center gap-1">
            <button
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              disabled={isSaving}
              onClick={handleCancel}
              type="button"
            >
              <X className="size-3" />
            </button>
            <button
              className="p-1 rounded hover:bg-green-100 text-muted-foreground hover:text-green-600 transition-colors dark:hover:bg-green-900/30"
              disabled={isSaving}
              onClick={handleSave}
              type="button"
            >
              {isSaving ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" />
              )}
            </button>
          </div>
        </div>
        {type === "textarea" ? (
          <Textarea
            className="min-h-[60px] text-sm"
            disabled={isSaving}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
          />
        ) : (
          <Input
            className="h-7 text-sm"
            disabled={isSaving}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={editValue}
          />
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center justify-between py-0.5 rounded px-1 -mx-1 transition-colors",
        !disabled && "hover:bg-accent/50 cursor-pointer",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
      onClick={handleStartEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleStartEdit();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium flex items-center gap-1.5">
        {displayValue}
        {!disabled && (
          <Pencil className="size-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-opacity" />
        )}
      </span>
    </div>
  );
}

// ============================================================================
// Editable Select Field — For status, priority, etc.
// ============================================================================

interface EditableSelectFieldProps {
  /** Current value */
  value: string | null;
  /** Label shown for the field */
  label: string;
  /** Available options */
  options: Array<{ value: string; label: string }>;
  /** Callback when value is saved */
  onSave: (value: string) => Promise<void>;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

export function EditableSelectField({
  value,
  label,
  options,
  onSave,
  disabled = false,
  className,
}: EditableSelectFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Sync edit value when prop changes
  useEffect(() => {
    setEditValue(value ?? "");
  }, [value]);

  // Focus select when editing starts
  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (disabled || isSaving) return;
    setIsEditing(true);
    setEditValue(value ?? "");
    setError(null);
  }, [disabled, isSaving, value]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const newValue = editValue;

    // Don't save if unchanged
    if (newValue === (value ?? "")) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(newValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [editValue, isSaving, onSave, value]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value ?? "");
    setError(null);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const selectedOption = options.find((o) => o.value === value);
  const displayValue = selectedOption?.label ?? "Not set";

  if (isEditing) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className="flex items-center gap-1">
            <button
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              disabled={isSaving}
              onClick={handleCancel}
              type="button"
            >
              <X className="size-3" />
            </button>
            <button
              className="p-1 rounded hover:bg-green-100 text-muted-foreground hover:text-green-600 transition-colors dark:hover:bg-green-900/30"
              disabled={isSaving}
              onClick={handleSave}
              type="button"
            >
              {isSaving ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" />
              )}
            </button>
          </div>
        </div>
        <select
          className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          disabled={isSaving}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          ref={selectRef}
          value={editValue}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center justify-between py-0.5 rounded px-1 -mx-1 transition-colors",
        !disabled && "hover:bg-accent/50 cursor-pointer",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
      onClick={handleStartEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleStartEdit();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium flex items-center gap-1.5">
        {displayValue}
        {!disabled && (
          <Pencil className="size-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-opacity" />
        )}
      </span>
    </div>
  );
}
