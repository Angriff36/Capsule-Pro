export declare const docs: import("fumadocs-mdx/config", { with: {
  "resolution-mode": "import",
}}).DocsCollection<
  import("zod").ZodObject<
    {
      title: import("zod").ZodString;
      description: import("zod").ZodOptional<import("zod").ZodString>;
      icon: import("zod").ZodOptional<import("zod").ZodString>;
      full: import("zod").ZodOptional<import("zod").ZodBoolean>;
      _openapi: import("zod").ZodOptional<
        import("zod").ZodObject<{}, import("zod/v4/core").$loose>
      >;
    },
    import("zod/v4/core").$strip
  >,
  import("zod").ZodObject<
    {
      title: import("zod").ZodOptional<import("zod").ZodString>;
      pages: import("zod").ZodOptional<
        import("zod").ZodArray<import("zod").ZodString>
      >;
      description: import("zod").ZodOptional<import("zod").ZodString>;
      root: import("zod").ZodOptional<import("zod").ZodBoolean>;
      defaultOpen: import("zod").ZodOptional<import("zod").ZodBoolean>;
      collapsible: import("zod").ZodOptional<import("zod").ZodBoolean>;
      icon: import("zod").ZodOptional<import("zod").ZodString>;
    },
    import("zod/v4/core").$strip
  >
>;
//# sourceMappingURL=source.config.d.ts.map
