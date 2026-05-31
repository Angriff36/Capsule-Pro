Exemptions Are Governed Debt, Not a Suppression Escape Hatch

Capsule-Pro has now settled that exemptions are a visible debt ledger, not a mechanism to hide runtime-bypass findings. The key decision was to stop using exemptions to suppress WRITE_ROUTE_BYPASSES_RUNTIME, while keeping them for explicit ownership-boundary exceptions outside command namespace. That shifted the program from “quiet the audit” to “classify and pay down debt.”
Enforcement exists in strict audit behavior, exemption metadata validation, and explicit test coverage. packages/manifest-runtime/packages/cli/src/commands/audit-routes.ts validates exemption ownership/expiry discipline and keeps bypass-runtime findings independent from exemption suppression, packages/manifest-runtime/packages/cli/src/commands/audit-routes.test.ts includes regression tests proving exempted routes still surface bypass-runtime findings, and strict route-boundary CI in .github/workflows/manifest-ci.yml ensures this behavior is not optional.
Debt remains substantial and intentionally exposed. The exemption registry still contains a large migration surface, and many entries are timed legacy paths that require command authoring or composite orchestration before removal; this is now tracked debt with accountability metadata rather than hidden status.


Summary:
This log records a settled governance boundary; remaining findings represent migration debt, not ambiguity. Exemptions are now treated as explicit debt registration rather than a way to mute bypass-runtime signals. The key settlement is that exemptions do not erase WRITE_ROUTE_BYPASSES_RUNTIME; they only classify boundary exceptions where appropriate. This prevents “green by suppression” and keeps migration pressure visible while still allowing justified exceptions.

Meaning links: 
C:\Projects\obsidian\Obsidian\decisions\Why Some Routes Bypass Manifest.md, C:\Projects\obsidian\Obsidian\specs\Route Ownership & Enforcement.md, C:\projects\capsule-pro\tasks\manifest-route-ownership-handoff.md.  

Enforcement links: C:\projects\capsule-pro\packages\manifest-runtime\packages\cli\src\commands\audit-routes-exemptions.json, C:\projects\capsule-pro\packages\manifest-runtime\packages\cli\src\commands\audit-routes.ts, C:\projects\capsule-pro\packages\manifest-runtime\packages\cli\src\commands\audit-routes.test.ts, C:\projects\capsule-pro\.github\workflows\manifest-ci.yml.

In plain terms: exemptions can explain debt, but they can’t hide it.
