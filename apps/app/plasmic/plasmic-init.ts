import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import { invariant } from "@/app/lib/invariant";
import { env } from "@/env";
import { registerPlasmicComponents } from "./register-components";

let loader: ReturnType<typeof initPlasmicLoader> | null = null;

export const getPlasmicLoader = () => {
  if (loader) {
    return loader;
  }

  const projectId = env.PLASMIC_PROJECT_ID;
  const token = env.PLASMIC_API_TOKEN;

  invariant(projectId, "PLASMIC_PROJECT_ID must be set");
  invariant(token, "PLASMIC_API_TOKEN must be set");

  loader = initPlasmicLoader({
    projects: [
      {
        id: projectId,
        token,
      },
    ],
    preview: process.env.NODE_ENV !== "production",
  });

  registerPlasmicComponents(
    loader.registerComponent.bind(loader) as any,
    "loader"
  );

  return loader;
};
