/**
 * Canonical location of the generated routes manifest, owned by the
 * `@repo/manifest-runtime` contract package (constitution §4a / §17).
 *
 * Feature code MUST NOT hardcode `manifest/runtime/routes.manifest.json`; it
 * imports this constant from `@repo/manifest-runtime/routes-manifest` instead.
 * Enforced by `pnpm manifest:contract:check`
 * (manifest/scripts/audit-contract-imports.mjs).
 *
 * The file itself is a generated runtime artifact
 * (`manifest/runtime/routes.manifest.json`); the path *knowledge* lives here,
 * inside the runtime/workspace boundary, so feature code never couples to the
 * physical generated path.
 */
export const ROUTES_MANIFEST_REL_PATH = "manifest/runtime/routes.manifest.json";
