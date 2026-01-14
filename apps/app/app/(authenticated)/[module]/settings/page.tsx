import { ModuleSection } from "../../components/module-section";

type ModuleSettingsPageProps = {
  params: Promise<{ module: string }>;
};

const ModuleSettingsPage = async ({ params }: ModuleSettingsPageProps) => {
  const { module } = await params;
  const label = module
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

  return (
    <ModuleSection
      title={`${label} Settings`}
      summary={`Module-level settings for ${label}.`}
    />
  );
};

export default ModuleSettingsPage;
