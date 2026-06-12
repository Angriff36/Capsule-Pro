import { cn } from "@repo/design-system/lib/utils";
import { ArrowRight } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

/**
 * FooterNewsletter — Cohere-aligned newsletter signup block used in the
 * site footer. Per DESIGN.md `footer-newsletter`: near-black primary
 * (`#17171c`) background, on-dark colour, micro typography (12px) for
 * supporting copy.
 *
 * The visible affordance is a single email field with an arrow submit
 * button. The label is rendered in coral mono caps to match Cohere's
 * editorial tone. `onSubmit` is forwarded the native form event; if a
 * caller wants async submission they should call `event.preventDefault()`
 * inside the handler.
 */
export interface FooterNewsletterProps {
  className?: string;
  description?: ReactNode;
  footnote?: ReactNode;
  label?: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  placeholder?: string;
  submitAriaLabel?: string;
}

export function FooterNewsletter({
  label = "Stay in the loop",
  description,
  placeholder = "you@example.com",
  submitAriaLabel = "Subscribe",
  onSubmit,
  footnote,
  className,
}: FooterNewsletterProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-md bg-[#17171c] p-8 text-canvas",
        className
      )}
      data-slot="footer-newsletter"
    >
      <span className="ds-mono-label text-coral">{label}</span>
      {description ? (
        <p className="ds-body-large text-canvas">{description}</p>
      ) : null}
      <form
        className="mt-2 flex items-center gap-2 border-canvas/40 border-b pb-2"
        onSubmit={onSubmit}
      >
        <input
          aria-label={submitAriaLabel}
          autoComplete="email"
          className="ds-body min-w-0 flex-1 bg-transparent text-canvas outline-none placeholder:text-canvas/50"
          name="email"
          placeholder={placeholder}
          required
          type="email"
        />
        <button
          aria-label={submitAriaLabel}
          className="flex size-8 items-center justify-center rounded-full bg-canvas text-ink transition-transform hover:translate-x-0.5"
          type="submit"
        >
          <ArrowRight className="size-4" />
        </button>
      </form>
      {footnote ? <p className="ds-micro text-canvas/60">{footnote}</p> : null}
    </section>
  );
}
