import {
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import { notFound } from "next/navigation";
import { getPlasmicLoader } from "@/plasmic/plasmic-init";

interface PlasmicPageProps {
  params: Promise<{
    slug?: string[];
  }>;
  searchParams?: Promise<Record<string, string | string[]>>;
}

const PlasmicPage = async ({ params, searchParams }: PlasmicPageProps) => {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const pathname = `/plasmic${slug?.length ? `/${slug.join("/")}` : ""}`;
  const PLASMIC = getPlasmicLoader();

  const prefetchedData = await PLASMIC.maybeFetchComponentData(pathname);

  if (!prefetchedData || prefetchedData.entryCompMetas.length === 0) {
    notFound();
  }

  const pageMeta = prefetchedData.entryCompMetas[0];

  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      pageParams={pageMeta.params}
      pageQuery={resolvedSearchParams}
      pageRoute={pageMeta.path}
      prefetchedData={prefetchedData}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
};

export default PlasmicPage;
