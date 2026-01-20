type ModuleSectionProperties = {
  title: string;
  summary: string;
};

export const ModuleSection = ({ title, summary }: ModuleSectionProperties) => (
  <div className="space-y-2">
    <h1 className="font-semibold text-2xl text-foreground">{title}</h1>
    <p className="max-w-2xl text-muted-foreground text-sm">{summary}</p>
  </div>
);
