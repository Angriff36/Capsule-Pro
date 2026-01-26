import { PlasmicComponent, PlasmicRootProvider } from "@plasmicapp/loader-nextjs"
import { notFound } from "next/navigation"
import { getPlasmicLoader } from "@/plasmic/plasmic-init"

type PlasmicPageProps = {
  params: Promise<{
    slug?: string[]
  }>
  searchParams?: Record<string, string | string[]>
}

const PlasmicPage = async ({ params, searchParams }: PlasmicPageProps) => {
  const { slug } = await params
  const pathname = `/plasmic${slug?.length ? `/${slug.join("/")}` : ""}`
  const PLASMIC = getPlasmicLoader()

  const prefetchedData = await PLASMIC.maybeFetchComponentData(pathname)

  if (!prefetchedData || prefetchedData.entryCompMetas.length === 0) {
    notFound()
  }

  const pageMeta = prefetchedData.entryCompMetas[0]

  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={prefetchedData}
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
      pageQuery={searchParams}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  )
}

export default PlasmicPage
