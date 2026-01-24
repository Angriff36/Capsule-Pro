Object.defineProperty(exports, "__esModule", { value: true });
exports.legal = exports.blog = void 0;
const basehub_1 = require("basehub");
const keys_1 = require("./keys");
require("./basehub.config");
const basehub = (0, basehub_1.basehub)({
  token: (0, keys_1.keys)().BASEHUB_TOKEN,
});
/* -------------------------------------------------------------------------------------------------
 * Common Fragments
 * -----------------------------------------------------------------------------------------------*/
const imageFragment = (0, basehub_1.fragmentOn)("BlockImage", {
  url: true,
  width: true,
  height: true,
  alt: true,
  blurDataURL: true,
});
/* -------------------------------------------------------------------------------------------------
 * Blog Fragments & Queries
 * -----------------------------------------------------------------------------------------------*/
const postMetaFragment = (0, basehub_1.fragmentOn)("PostsItem", {
  _slug: true,
  _title: true,
  authors: {
    _title: true,
    avatar: imageFragment,
    xUrl: true,
  },
  categories: {
    _title: true,
  },
  date: true,
  description: true,
  image: imageFragment,
});
const postFragment = (0, basehub_1.fragmentOn)("PostsItem", {
  ...postMetaFragment,
  body: {
    plainText: true,
    json: {
      content: true,
      toc: true,
    },
    readingTime: true,
  },
});
exports.blog = {
  postsQuery: (0, basehub_1.fragmentOn)("Query", {
    blog: {
      posts: {
        items: postMetaFragment,
      },
    },
  }),
  latestPostQuery: (0, basehub_1.fragmentOn)("Query", {
    blog: {
      posts: {
        __args: {
          orderBy: "_sys_createdAt__DESC",
        },
        item: postFragment,
      },
    },
  }),
  postQuery: (slug) => ({
    blog: {
      posts: {
        __args: {
          filter: {
            _sys_slug: { eq: slug },
          },
        },
        item: postFragment,
      },
    },
  }),
  getPosts: async () => {
    const data = await basehub.query(exports.blog.postsQuery);
    return data.blog.posts.items;
  },
  getLatestPost: async () => {
    const data = await basehub.query(exports.blog.latestPostQuery);
    return data.blog.posts.item;
  },
  getPost: async (slug) => {
    const query = exports.blog.postQuery(slug);
    const data = await basehub.query(query);
    return data.blog.posts.item;
  },
};
/* -------------------------------------------------------------------------------------------------
 * Legal Fragments & Queries
 * -----------------------------------------------------------------------------------------------*/
const legalPostMetaFragment = (0, basehub_1.fragmentOn)("LegalPagesItem", {
  _slug: true,
  _title: true,
});
const legalPostFragment = (0, basehub_1.fragmentOn)("LegalPagesItem", {
  ...legalPostMetaFragment,
  body: {
    plainText: true,
    json: {
      content: true,
      toc: true,
    },
    readingTime: true,
  },
});
exports.legal = {
  postsQuery: (0, basehub_1.fragmentOn)("Query", {
    _componentInstances: {
      legalPagesItem: {
        items: legalPostFragment,
      },
    },
  }),
  latestPostQuery: (0, basehub_1.fragmentOn)("Query", {
    _componentInstances: {
      legalPagesItem: {
        __args: {
          orderBy: "_sys_createdAt__DESC",
        },
        item: legalPostFragment,
      },
    },
  }),
  postQuery: (slug) =>
    (0, basehub_1.fragmentOn)("Query", {
      _componentInstances: {
        legalPagesItem: {
          __args: {
            filter: {
              _sys_slug: { eq: slug },
            },
          },
          item: legalPostFragment,
        },
      },
    }),
  getPosts: async () => {
    const data = await basehub.query(exports.legal.postsQuery);
    return data._componentInstances.legalPagesItem.items;
  },
  getLatestPost: async () => {
    const data = await basehub.query(exports.legal.latestPostQuery);
    return data._componentInstances.legalPagesItem.item;
  },
  getPost: async (slug) => {
    const query = exports.legal.postQuery(slug);
    const data = await basehub.query(query);
    return data._componentInstances.legalPagesItem.item;
  },
};
