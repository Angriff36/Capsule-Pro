import { cn } from "@repo/design-system/lib/utils";
import type { FormEvent, ReactNode } from "react";

/**
 * ContactFormCard — Cohere-aligned form container used for "Request a
 * demo" / "Talk to sales" surfaces. Per DESIGN.md `contact-form-card`:
 * canvas background, ink text, 22px (`rounded-media`) radius, 32px
 * padding.
 *
 * Renders a header (eyebrow + title + supporting copy) and a form body.
 * Form fields are caller-supplied via `children` so the design-system
 * package does not couple itself to a specific schema or validation
 * library; the card just owns surface, spacing, and the optional
 * `submitLabel` button at the bottom.
 *
 * The card is intentionally silent about layout inside the body — host
 * forms typically use a 2-column grid for first/last name, then full
 * width for company / message — but the component sets a sensible
 * `flex flex-col gap-5` default that callers can override.
 */
export interface ContactFormCardProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  submitLabel?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  footnote?: ReactNode;
  className?: string;
  formClassName?: string;
}

export function ContactFormCard({
  eyebrow,
  title,
  description,
  submitLabel = "Submit",
  onSubmit,
  children,
  footnote,
  className,
  formClassName,
}: ContactFormCardProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-6 rounded-media border border-card-border bg-canvas p-8 text-ink",
        className
      )}
      data-slot="contact-form-card"
    >
      {eyebrow || title || description ? (
        <header className="flex flex-col gap-3">
          {eyebrow ? (
            <span className="ds-mono-label text-ink/60">{eyebrow}</span>
          ) : null}
          {title ? <h2 className="ds-card-heading text-ink">{title}</h2> : null}
          {description ? (
            <p className="ds-body text-ink/75">{description}</p>
          ) : null}
        </header>
      ) : null}
      <form
        className={cn("flex flex-col gap-5", formClassName)}
        onSubmit={onSubmit}
      >
        {children}
        <button
          className="ds-button mt-2 inline-flex items-center justify-center gap-2 self-start rounded-pill bg-[#17171c] px-6 py-3 text-canvas transition-colors hover:bg-[#000000]"
          type="submit"
        >
          {submitLabel}
        </button>
      </form>
      {footnote ? <p className="ds-caption text-ink/60">{footnote}</p> : null}
    </section>
  );
}
