"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { cn } from "@repo/design-system/lib/utils";

interface DateTimePickerProps {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  min?: string;
  max?: string;
  required?: boolean;
}

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  // Accept both "2026-05-11T14:30" and "2026-05-11" formats
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
}

function formatDisplay(date: Date | undefined): string {
  if (!date) return "";
  return format(date, "MMM d, yyyy");
}

function formatTime(date: Date | undefined): string {
  if (!date) return "";
  return format(date, "HH:mm");
}

function synthEvent(value: string): React.ChangeEvent<HTMLInputElement> {
  return {
    target: { value },
    currentTarget: { value },
  } as unknown as React.ChangeEvent<HTMLInputElement>;
}

/**
 * DateTimePicker — drop-in replacement for `<Input type="datetime-local">`.
 * Renders a date picker + time input side by side.
 *
 * ✅Context7 Verified (shadcn/ui DatePicker + time pattern)
 */
export function DateTimePicker({
  value,
  onChange,
  onBlur,
  placeholder = "Pick a date",
  disabled = false,
  className,
  id,
  name,
  min,
  max,
  required,
  ...rest
}: DateTimePickerProps &
  Omit<
    React.ComponentProps<"input">,
    "value" | "onChange" | "type" | "min" | "max"
  >) {
  const [open, setOpen] = React.useState(false);
  const date = toDate(value);
  const datePart = value ? value.split("T")[0] : undefined;
  const timePart = value ? value.split("T")[1]?.substring(0, 5) ?? "" : "";

  const [inputValue, setInputValue] = React.useState(formatDisplay(date));
  const [isTyping, setIsTyping] = React.useState(false);

  // Sync display when value changes externally
  React.useEffect(() => {
    if (!isTyping) {
      setInputValue(formatDisplay(toDate(value)));
    }
  }, [value, isTyping]);

  const emitChange = (dateStr: string, timeStr: string) => {
    if (dateStr) {
      onChange?.(
        synthEvent(timeStr ? `${dateStr}T${timeStr}` : dateStr)
      );
    }
  };

  const handleCalendarSelect = (selected: Date | undefined) => {
    setIsTyping(false);
    if (selected) {
      const iso = format(selected, "yyyy-MM-dd");
      setInputValue(formatDisplay(selected));
      emitChange(iso, timePart);
    }
    setOpen(false);
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTyping(true);
    setInputValue(e.target.value);
    const parsed = new Date(e.target.value);
    if (isValid(parsed)) {
      emitChange(format(parsed, "yyyy-MM-dd"), timePart);
    }
  };

  const handleDateInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsTyping(false);
    setInputValue(formatDisplay(toDate(value)));
    onBlur?.(e);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    emitChange(datePart ?? "", newTime);
  };

  const minDate = min ? toDate(min) : undefined;
  const maxDate = max ? toDate(max) : undefined;

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <Input
          type="text"
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onChange={handleDateInputChange}
          onBlur={handleDateInputBlur}
          className="pr-8"
          autoComplete="off"
          {...rest}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
              type="button"
              aria-label="Open date picker"
            >
              <CalendarIcon className="size-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleCalendarSelect}
              disabled={(d) => {
                if (minDate && d < minDate) return true;
                if (maxDate && d > maxDate) return true;
                return false;
              }}
              defaultMonth={date ?? new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>
      <Input
        type="time"
        value={timePart}
        onChange={handleTimeChange}
        disabled={disabled}
        required={required}
        className="w-32 flex-shrink-0"
        aria-label="Time"
      />
    </div>
  );
}
