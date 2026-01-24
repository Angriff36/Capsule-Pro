import { fragmentOn } from "basehub";
import "./basehub.config";
declare const postMetaFragment: {
  readonly _slug: true;
  readonly _title: true;
  readonly authors: {
    readonly _title: true;
    readonly avatar: {
      readonly url: true;
      readonly width: true;
      readonly height: true;
      readonly alt: true;
      readonly blurDataURL: true;
    } & {
      __fragmentOn: "BlockImage";
    };
    readonly xUrl: true;
  };
  readonly categories: {
    readonly _title: true;
  };
  readonly date: true;
  readonly description: true;
  readonly image: {
    readonly url: true;
    readonly width: true;
    readonly height: true;
    readonly alt: true;
    readonly blurDataURL: true;
  } & {
    __fragmentOn: "BlockImage";
  };
} & {
  __fragmentOn: "PostsItem";
};
declare const postFragment: {
  readonly body: {
    readonly plainText: true;
    readonly json: {
      readonly content: true;
      readonly toc: true;
    };
    readonly readingTime: true;
  };
  readonly _slug: true;
  readonly _title: true;
  readonly authors: {
    readonly _title: true;
    readonly avatar: {
      readonly url: true;
      readonly width: true;
      readonly height: true;
      readonly alt: true;
      readonly blurDataURL: true;
    } & {
      __fragmentOn: "BlockImage";
    };
    readonly xUrl: true;
  };
  readonly categories: {
    readonly _title: true;
  };
  readonly date: true;
  readonly description: true;
  readonly image: {
    readonly url: true;
    readonly width: true;
    readonly height: true;
    readonly alt: true;
    readonly blurDataURL: true;
  } & {
    __fragmentOn: "BlockImage";
  };
  readonly __fragmentOn: "PostsItem";
} & {
  __fragmentOn: "PostsItem";
};
export type PostMeta = fragmentOn.infer<typeof postMetaFragment>;
export type Post = fragmentOn.infer<typeof postFragment>;
export declare const blog: {
  postsQuery: {
    readonly blog: {
      readonly posts: {
        readonly items: {
          readonly _slug: true;
          readonly _title: true;
          readonly authors: {
            readonly _title: true;
            readonly avatar: {
              readonly url: true;
              readonly width: true;
              readonly height: true;
              readonly alt: true;
              readonly blurDataURL: true;
            } & {
              __fragmentOn: "BlockImage";
            };
            readonly xUrl: true;
          };
          readonly categories: {
            readonly _title: true;
          };
          readonly date: true;
          readonly description: true;
          readonly image: {
            readonly url: true;
            readonly width: true;
            readonly height: true;
            readonly alt: true;
            readonly blurDataURL: true;
          } & {
            __fragmentOn: "BlockImage";
          };
        } & {
          __fragmentOn: "PostsItem";
        };
      };
    };
  } & {
    __fragmentOn: "Query";
  };
  latestPostQuery: {
    readonly blog: {
      readonly posts: {
        readonly __args: {
          readonly orderBy: "_sys_createdAt__DESC";
        };
        readonly item: {
          readonly body: {
            readonly plainText: true;
            readonly json: {
              readonly content: true;
              readonly toc: true;
            };
            readonly readingTime: true;
          };
          readonly _slug: true;
          readonly _title: true;
          readonly authors: {
            readonly _title: true;
            readonly avatar: {
              readonly url: true;
              readonly width: true;
              readonly height: true;
              readonly alt: true;
              readonly blurDataURL: true;
            } & {
              __fragmentOn: "BlockImage";
            };
            readonly xUrl: true;
          };
          readonly categories: {
            readonly _title: true;
          };
          readonly date: true;
          readonly description: true;
          readonly image: {
            readonly url: true;
            readonly width: true;
            readonly height: true;
            readonly alt: true;
            readonly blurDataURL: true;
          } & {
            __fragmentOn: "BlockImage";
          };
          readonly __fragmentOn: "PostsItem";
        } & {
          __fragmentOn: "PostsItem";
        };
      };
    };
  } & {
    __fragmentOn: "Query";
  };
  postQuery: (slug: string) => {
    blog: {
      posts: {
        __args: {
          filter: {
            _sys_slug: {
              eq: string;
            };
          };
        };
        item: {
          readonly body: {
            readonly plainText: true;
            readonly json: {
              readonly content: true;
              readonly toc: true;
            };
            readonly readingTime: true;
          };
          readonly _slug: true;
          readonly _title: true;
          readonly authors: {
            readonly _title: true;
            readonly avatar: {
              readonly url: true;
              readonly width: true;
              readonly height: true;
              readonly alt: true;
              readonly blurDataURL: true;
            } & {
              __fragmentOn: "BlockImage";
            };
            readonly xUrl: true;
          };
          readonly categories: {
            readonly _title: true;
          };
          readonly date: true;
          readonly description: true;
          readonly image: {
            readonly url: true;
            readonly width: true;
            readonly height: true;
            readonly alt: true;
            readonly blurDataURL: true;
          } & {
            __fragmentOn: "BlockImage";
          };
          readonly __fragmentOn: "PostsItem";
        } & {
          __fragmentOn: "PostsItem";
        };
      };
    };
  };
  getPosts: () => Promise<PostMeta[]>;
  getLatestPost: () => Promise<Post | null>;
  getPost: (slug: string) => Promise<Post | null>;
};
declare const legalPostMetaFragment: {
  readonly _slug: true;
  readonly _title: true;
} & {
  __fragmentOn: "LegalPagesItem";
};
declare const legalPostFragment: {
  readonly body: {
    readonly plainText: true;
    readonly json: {
      readonly content: true;
      readonly toc: true;
    };
    readonly readingTime: true;
  };
  readonly _slug: true;
  readonly _title: true;
  readonly __fragmentOn: "LegalPagesItem";
} & {
  __fragmentOn: "LegalPagesItem";
};
export type LegalPostMeta = fragmentOn.infer<typeof legalPostMetaFragment>;
export type LegalPost = fragmentOn.infer<typeof legalPostFragment>;
export declare const legal: {
  postsQuery: {
    readonly _componentInstances: {
      readonly legalPagesItem: {
        readonly items: {
          readonly body: {
            readonly plainText: true;
            readonly json: {
              readonly content: true;
              readonly toc: true;
            };
            readonly readingTime: true;
          };
          readonly _slug: true;
          readonly _title: true;
          readonly __fragmentOn: "LegalPagesItem";
        } & {
          __fragmentOn: "LegalPagesItem";
        };
      };
    };
  } & {
    __fragmentOn: "Query";
  };
  latestPostQuery: {
    readonly _componentInstances: {
      readonly legalPagesItem: {
        readonly __args: {
          readonly orderBy: "_sys_createdAt__DESC";
        };
        readonly item: {
          readonly body: {
            readonly plainText: true;
            readonly json: {
              readonly content: true;
              readonly toc: true;
            };
            readonly readingTime: true;
          };
          readonly _slug: true;
          readonly _title: true;
          readonly __fragmentOn: "LegalPagesItem";
        } & {
          __fragmentOn: "LegalPagesItem";
        };
      };
    };
  } & {
    __fragmentOn: "Query";
  };
  postQuery: (slug: string) => {
    readonly _componentInstances: {
      readonly legalPagesItem: {
        readonly __args: {
          readonly filter: {
            readonly _sys_slug: {
              readonly eq: string;
            };
          };
        };
        readonly item: {
          readonly body: {
            readonly plainText: true;
            readonly json: {
              readonly content: true;
              readonly toc: true;
            };
            readonly readingTime: true;
          };
          readonly _slug: true;
          readonly _title: true;
          readonly __fragmentOn: "LegalPagesItem";
        } & {
          __fragmentOn: "LegalPagesItem";
        };
      };
    };
  } & {
    __fragmentOn: "Query";
  };
  getPosts: () => Promise<LegalPost[]>;
  getLatestPost: () => Promise<LegalPost | null>;
  getPost: (slug: string) => Promise<LegalPost | null>;
};
//# sourceMappingURL=index.d.ts.map
