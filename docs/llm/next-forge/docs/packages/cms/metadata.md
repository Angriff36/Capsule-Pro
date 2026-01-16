[Vercel](https://vercel.com/)Slash[next-forge](/en)

* [Docs](/en/docs)
* [Source](https://github.com/vercel/next-forge/)

Search...`⌘K`Ask AI

Ask AI

Introduction

[Overview](/docs)[Philosophy](/docs/philosophy)[Structure](/docs/structure)[Updates](/docs/updates)[FAQ](/docs/faq)

Usage

Setup

Apps

Packages

Deployment

Other

Addons

Examples

Migrations

# Metadata

How the title, description, and Open Graph images are configured in the CMS.

To generate metadata for a particular page or collection item, we can use the BaseHub SDK to query the metadata, then use Next.js' `generateMetadata` function to generate the metadata.

For example, here's how we've wired up the metadata for the blog post page, using the `createMetadata` function from the [SEO](/en/packages/seo/metadata) package:

```
import { blog } from '@repo/cms';

type BlogPostProperties = {
  readonly params: Promise<{
    slug: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: BlogPostProperties): Promise<Metadata> => {
  const { slug } = await params;
  const post = await blog.getPost(slug);

  if (!post) {
    return {};
  }

  return createMetadata({
    title: post._title,
    description: post.description,
    image: post.image.url,
  });
};
```

`blog.getPost` is a function that abstracts the logic of fetching the blog post from the CMS. Under the hood, it uses the BaseHub SDK to fetch the blog post from the CMS:

```
import { basehub, fragmentOn } from 'basehub';

const postFragment = fragmentOn('PostsItem', {
  _slug: true,
  _title: true,
  authors: {
    _title: true,
    avatar: imageFragment,
    xUrl: true,
  },
  body: {
    plainText: true,
    json: {
      content: true,
      toc: true,
    },
    readingTime: true,
  },
  categories: {
    _title: true,
  },
  date: true,
  description: true,
  image: imageFragment,
});

export const blog = {
  // ...

  postQuery: (slug: string) => ({
    blog: {
      posts: {
        __args: {
          filter: {
            _sys_slug: { eq: slug },
          },
        },
        items: postFragment,
      },
    },
  }),

  getPost: async (slug: string) => {
    const query = blog.postQuery(slug);
    const data = await basehub().query(query);

    return data.blog.posts.items.at(0);
  },
};
```

### On this page

No Headings

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/cms/metadata.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)