import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ReactNode } from 'react';

type CalloutVariant = 'info' | 'tip' | 'note' | 'warning';

const calloutStyles: Record<CalloutVariant, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  tip: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  note: 'border-slate-200 bg-slate-50 text-slate-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
};

type CalloutProps = {
  title?: string;
  children: ReactNode;
  variant: CalloutVariant;
};

const Callout = ({ title, children, variant }: CalloutProps) => (
  <div className={`rounded-lg border p-4 text-sm ${calloutStyles[variant]}`}>
    {title ? <div className="mb-2 font-semibold">{title}</div> : null}
    <div className="space-y-2">{children}</div>
  </div>
);

type CardGroupProps = {
  children: ReactNode;
  cols?: number;
};

const CardGroup = ({ children, cols }: CardGroupProps) => (
  <div
    className="grid gap-4"
    style={
      cols && cols > 0
        ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
        : undefined
    }
  >
    {children}
  </div>
);

type CardProps = {
  title: string;
  icon?: string;
  href?: string;
  children: ReactNode;
};

const Card = ({ title, icon, href, children }: CardProps) => {
  const Wrapper = href ? 'a' : 'div';
  return (
    <Wrapper
      className="group hover:-translate-y-0.5 rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm transition hover:border-border hover:shadow-md"
      href={href}
    >
      <div className="mb-2 flex items-center gap-2 font-semibold text-sm">
        {icon ? (
          <span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">
            {icon}
          </span>
        ) : null}
        <span>{title}</span>
      </div>
      <div className="text-muted-foreground text-sm">{children}</div>
    </Wrapper>
  );
};

type AccordionGroupProps = {
  children: ReactNode;
};

const AccordionGroup = ({ children }: AccordionGroupProps) => (
  <div className="space-y-3">{children}</div>
);

type AccordionProps = {
  title: string;
  children: ReactNode;
  icon?: string;
};

const Accordion = ({ title, children, icon }: AccordionProps) => (
  <details className="rounded-lg border border-border/60 bg-card/70 px-4 py-2">
    <summary className="cursor-pointer list-none py-2 font-semibold text-sm">
      <span className="flex items-center gap-2">
        {icon ? (
          <span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">
            {icon}
          </span>
        ) : null}
        {title}
      </span>
    </summary>
    <div className="pb-3 text-muted-foreground text-sm">{children}</div>
  </details>
);

type ResponseFieldProps = {
  name: string;
  type?: ReactNode;
  required?: boolean;
  default?: ReactNode;
  children?: ReactNode;
};

const ResponseField = ({ name, type, required, default: defaultValue, children }: ResponseFieldProps) => (
  <div className="rounded-lg border border-border/60 bg-card/70 p-3">
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <code className="rounded bg-muted px-2 py-1 text-[12px]">{name}</code>
      {type ? (
        <span className="text-muted-foreground text-xs">type: {type}</span>
      ) : null}
      {required ? (
        <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-[10px] text-rose-700 uppercase">
          required
        </span>
      ) : null}
      {defaultValue ? (
        <span className="text-muted-foreground text-xs">default: {defaultValue}</span>
      ) : null}
    </div>
    {children ? <div className="mt-2 space-y-2">{children}</div> : null}
  </div>
);

export const getMDXComponents = (components?: MDXComponents): MDXComponents => ({
  ...defaultMdxComponents,
  CardGroup,
  Card,
  AccordionGroup,
  Accordion,
  Info: ({ children }) => <Callout variant="info" title="Info">{children}</Callout>,
  Tip: ({ children }) => <Callout variant="tip" title="Tip">{children}</Callout>,
  Note: ({ children }) => <Callout variant="note" title="Note">{children}</Callout>,
  Warning: ({ children }) => <Callout variant="warning" title="Warning">{children}</Callout>,
  ResponseField,
  ...components,
});
