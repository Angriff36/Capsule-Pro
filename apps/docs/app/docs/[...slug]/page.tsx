import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getMDXComponents } from '@/mdx-components';
import { source } from '@/lib/source';

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export const dynamicParams = false;

export const generateStaticParams = () => source.generateParams();

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const params = await props.params;
  const page = source.getPage(params.slug ?? []);
  if (!page) {
    return {};
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
};

const DocsPageRoute = async (props: PageProps) => {
  const params = await props.params;
  const page = source.getPage(params.slug ?? []);

  if (!page) {
    notFound();
  }

  const { body: MdxContent, toc } = await page.data.load();

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? (
        <DocsDescription>{page.data.description}</DocsDescription>
      ) : null}
      <DocsBody>
        <MdxContent
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
};

export default DocsPageRoute;
