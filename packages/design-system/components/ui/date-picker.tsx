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

interface DatePickerProps {
  value?: string;
  defaultValue?: string;
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
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
}

function formatDisplay(date: Date | undefined): string {
  if (!date) return "";
  return format(date, "MMM d, yyyy");
}

/**
 * Synthetic change event for calendar selection — mimics e.target.value so
 * existing onChange={(e) => handler(e.target.value)} patterns work unchanged.
 */
function synthEvent(value: string): React.ChangeEvent<HTMLInputElement> {
  return {
    target: { value },
    currentTarget: { value },
  } as unknown as React.ChangeEvent<HTMLInputElement>;
}

/**
 * DatePicker — a drop-in replacement for `<Input type="date">`.
 * Provides a text input for free typing + a calendar popover for visual selection.
 * Value/onChange use ISO date strings (YYYY-MM-DD) for form compatibility.
 *
 * ✅Context7 Verified (shadcn/ui DatePicker pattern)
 */
export function DatePicker({
  value,
  defaultValue,
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
}: DatePickerProps &
  Omit<
    React.ComponentProps<"input">,
    "value" | "defaultValue" | "onChange" | "type" | "min" | "max" | "name"
  >) {
  const [open, setOpen] = React.useState(false);
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue ?? ""
  );
  const selectedValue = isControlled ? value : uncontrolledValue;
  const [inputValue, setInputValue] = React.useState(
    formatDisplay(toDate(selectedValue))
  );
  const [isTyping, setIsTyping] = React.useState(false);
  const date = toDate(selectedValue);

  // Sync input display when external value changes (calendar selection, form reset)
  React.useEffect(() => {
    if (!isTyping) {
      setInputValue(formatDisplay(toDate(selectedValue)));
    }
  }, [selectedValue, isTyping]);

  const commitValue = (nextValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }
    onChange?.(synthEvent(nextValue));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTyping(true);
    setInputValue(e.target.value);

    // Try to parse what the user typed
    const parsed = parseISO(e.target.value);
    if (isValid(parsed)) {
      commitValue(format(parsed, "yyyy-MM-dd"));
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsTyping(false);
    const d = toDate(selectedValue);
    setInputValue(formatDisplay(d));
    onBlur?.(e);
  };

  const handleCalendarSelect = (selected: Date | undefined) => {
    setIsTyping(false);
    if (selected) {
      const iso = format(selected, "yyyy-MM-dd");
      setInputValue(formatDisplay(selected));
      commitValue(iso);
    }
    setOpen(false);
  };

  const minDate = min ? toDate(min) : undefined;
  const maxDate = max ? toDate(max) : undefined;

  return (
    <div className={cn("relative", className)}>
      {name ? <input name={name} type="hidden" value={selectedValue} /> : null}
      <Input
        id={id}
        type="text"
        value={inputValue}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
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
  );
}
