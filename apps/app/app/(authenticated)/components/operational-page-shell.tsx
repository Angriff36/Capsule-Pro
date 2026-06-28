import {
  OperationalColumn,
  PageBody,
  PageCanvas,
  PageLead,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import type { ReactNode } from "react";

export type OperationalPageShellProps = {
  /** Mono eyebrow, e.g. "Kitchen / Inventory" */
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** False inside `/kitchen/**` — layout already provides PageCanvas */
  withCanvas?: boolean;
};

/** Light operational page shell (PageLead, no CommandBand). */
export function OperationalPageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  withCanvas = true,
}: OperationalPageShellProps) {
  const body = (
    <>
      <PageLead
        actions={actions}
        description={description}
        eyebrow={eyebrow}
        title={title}
      />
      <PageBody>
        <OperationalColumn>{children}</OperationalColumn>
      </PageBody>
    </>
  );

  if (withCanvas) {
    return <PageCanvas>{body}</PageCanvas>;
  }

  return body;
}

export type OperationalSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/** Section block with SectionHeader + content spacing. */
export function OperationalSection({
  title,
  description,
  actions,
  children,
}: OperationalSectionProps) {
  return (
    <section className="space-y-6">
      <SectionHeader actions={actions} description={description} title={title} />
      {children}
    </section>
  );
}

/** Loading skeleton matching OperationalPageShell rhythm. */
export function OperationalPageSkeleton({
  withCanvas = true,
}: {
  withCanvas?: boolean;
}) {
  const body = (
    <>
      <div className="space-y-3 border-hairline border-b pb-8">
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        <div className="h-9 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-6 pt-10">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div className="h-28 animate-pulse rounded-[22px] bg-muted" key={i} />
          ))}
        </div>
      </div>
    </>
  );

  if (withCanvas) {
    return (
      <PageCanvas>
        {body}
      </PageCanvas>
    );
  }

  return body;
}
