# Manifest Introspection (IR vs Store Reads)

Capsule-Pro separates two introspection surfaces:

## IR Introspection

**Lists possible behavior.** Use `query_ir_summary` (MCP) or equivalent IR-loading APIs.

- **entities**: name, property count, command names
- **commands**: name, entity, parameter names, emits
- **events**: name, channel
- **policies**: name, action, entity (if set)

IR is authoritative for command definitions. The IR has a root `commands` list; entities reference command names. See `packages/manifest-runtime/docs/spec/ir/ir-v1.schema.json` (IRCommand + IREntity.commands).

## Store Reads (Instance Listing)

**Lists current instances.** Use `list_entities` (MCP) or direct store access.

- Takes `entityName`
- Uses the configured `storeProvider`/store to call `getAll()` (and optionally `getById()`)
- **Never** routes through `runCommand` for reads

Reads may bypass the runtime. Writes must execute via `RuntimeEngine.runCommand`.

## No Built-in List Command

There is **no built-in `list` command** unless you define one in Manifest. The IR does not include a generic `list` command for entities. Calling `runCommand("list", ...)` will fail with `Command 'list' not found` when no such command exists in the IR.

To list instances, use store reads (`getAll`/`getById`) directly.
