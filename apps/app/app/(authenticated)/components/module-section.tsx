type ModuleSectionProperties = {
  title: string;
  summary: string;
};

export const ModuleSection = ({ title, summary }: ModuleSectionProperties) => (
  <div className="space-y-2">
    <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
    <p className="max-w-2xl text-sm text-muted-foreground">{summary}</p>
  </div>
);
