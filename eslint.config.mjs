/**
 * ESLint Configuration — Canonical Route & Import Enforcement
 *
 * This project uses Biome for general linting. This ESLint config exists
 * for rules that Biome does not support:
 * - no-restricted-syntax: Ban hardcoded /api/ paths
 * - no-restrict-imports: Ban @repo/ui imports (use @repo/design-system)
 *
 * Install:  pnpm add -D eslint
 * Run:      pnpm eslint --no-eslintrc -c eslint.config.mjs "apps/app/**/*.{ts,tsx}"
 *
 * The CI scan script (scripts/check-hardcoded-routes.mjs) provides the same
 * check without requiring ESLint to be installed.
 */

/** @type {import("eslint").Linter.Config[]} */
export default [
  // ---------------------------------------------------------------------------
  // Rule: Ban @repo/ui imports (package doesn't exist, use @repo/design-system)
  // ---------------------------------------------------------------------------
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@repo/ui", "@repo/ui/*"],
              message:
                "@repo/ui does not exist. Use @repo/design-system instead.",
            },
          ],
        },
      ],
    },
  },
  // ---------------------------------------------------------------------------
  // Rule: Ban hardcoded "/api/" string literals in client code
  // ---------------------------------------------------------------------------
  {
    files: [
      "apps/app/**/*.ts",
      "apps/app/**/*.tsx",
      "packages/design-system/**/*.ts",
      "packages/design-system/**/*.tsx",
    ],
    ignores: [
      // Allowlisted files that ARE permitted to contain /api/ strings:
      "apps/app/app/lib/routes.ts", // Generated route helpers (canonical definitions)
      "apps/app/app/lib/api.ts", // apiFetch wrapper (dev guard loads manifest)
      "apps/app/next.config.ts", // Next.js rewrite proxy rules
      "apps/app/app/api/**", // Server-side route handlers
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\/api\\//]",
          message:
            'Do not hardcode /api/ paths. Import a route helper from "@/lib/routes" instead. See AGENTS.md § "How to Add a New Route".',
        },
        {
          selector: "TemplateLiteral[quasis.0.value.raw=/\\/api\\//]",
          message:
            'Do not hardcode /api/ paths in template literals. Import a route helper from "@/lib/routes" instead. See AGENTS.md § "How to Add a New Route".',
        },
      ],
    },
  },
];
