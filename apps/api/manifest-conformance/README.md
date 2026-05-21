# Manifest IR Contract Reference

> **This is NOT conformance evidence.** Earlier this file lived under `commands-contract.conformance.json` where it was matched by the `missing-tests` detector's `*.conformance.json` glob. That made `pnpm manifest integration-check` pass by substring-matching every `commandId`. That was detector-only / fake compliance and was removed. The file is now renamed (`commands-contract.json`, no `.conformance` suffix) and serves only as a human-readable reference for the IR's command contract surface.

## `commands-contract.json`

Read-only projection of `manifest-registry/commands.json`. For each governed command:
- `commandId` (e.g. `Recipe.create`)
- `entity` and `command` slug
- `policies` (role/policy gates)
- `guardCount`
- `emits` (event channels)
- `effects` (`compute`, `mutate`, etc.)

Useful for code review, command-surface diffs across IR versions, and quick `grep`. **Not a substitute for runtime tests.**

## Regenerating

```
node -e "const fs=require('fs');const r=JSON.parse(fs.readFileSync('manifest-registry/commands.json','utf8'));fs.writeFileSync('apps/api/manifest-conformance/commands-contract.json',JSON.stringify({_kind:'manifest-ir-contract-reference',irHash:r.irHash,compilerVersion:r.compilerVersion,contracts:r.commands.map(c=>({commandId:c.commandId,entity:c.entity,command:c.command,policies:c.policies,guardCount:c.guardCount,emits:c.emits,effects:c.effects}))},null,2));"
```

Run after any change to `packages/manifest-adapters/manifests/*.manifest`.

## Real conformance evidence

Per `docs/manifest/governance.md`, real conformance evidence is `*.test.{ts,tsx,js}` files that invoke `runCommand` against compiled IR and assert outcomes/emitted events. Adding such tests is the only honest path to closing the `missing-tests` detector findings.
