import { OperationalPageShell, OperationalSection } from "./operational-page-shell";

interface ModuleSectionProperties {
  summary: string;
  title: string;
}

export const ModuleSection = ({ title, summary }: ModuleSectionProperties) => (
  <OperationalPageShell description={summary} eyebrow="Module" title={title}>
    <OperationalSection title="Module features">
      <p className="text-muted-foreground text-sm">
        This module section is under development. Check back soon for updates.
      </p>
    </OperationalSection>
  </OperationalPageShell>
);
