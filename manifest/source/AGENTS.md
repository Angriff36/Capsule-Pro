---
source: Manifest published docs (mintlify) — embedded verbatim
divergences: U6, U4, U1, U2, U7, U11, U30
pages: language/modules, language/tenancy, language/roles, language/types, language/advanced-entities
note: >-
  These are COMPLETE Manifest documentation pages. Not every section applies to this directory. Read the embedded page(s) and follow the parts relevant to the change you are making here. Do not treat unrelated sections as required work.
---

# Manifest reference for `manifest/source`

**Why this file:** Authoring the 102 .manifest files: consolidate the per-file tenant block into one shared base (U6 keystone), DRY infra fields via mixins (U4), declare a role hierarchy instead of literal role arrays (U1), put onDelete/onUpdate referential actions and back-relations in the IR (U2/U11), and model closed value-sets as enums (U7).

**Relevant divergences:** U6, U4, U1, U2, U7, U11, U30 — see `manifest/MANIFEST-DIVERGENCES.md` for the full remediation detail.

**How to use:** These are COMPLETE Manifest documentation pages. Not every section applies to this directory. Read the embedded page(s) and follow the parts relevant to the change you are making here. Do not treat unrelated sections as required work.

---

## 📄 Manifest doc — `language/modules` · Modules: multi-file projects and imports

Manifest supports multi-file projects through `use` declarations and `import` statements. The module resolver discovers all referenced files, detects cycles, sorts them topologically, and merges the compiled IR into a single deterministic output. This lets you split large programs into focused files without sacrificing whole-program validation.

## Use declarations

The `use` keyword includes another `.manifest` file. Use declarations must appear at the top of the file, before any entity, event, or store declarations:

```manifest
// app.manifest
use "./shared/types.manifest"
use "./domains/order.manifest"
use "./domains/product.manifest"
```

The resolver walks `use` declarations recursively to discover the full file graph. A `use` path must be relative and end in `.manifest` — absolute paths and extensions other than `.manifest` produce a parse error.

## Import statements

For selective imports, use the `import` syntax to bring specific symbols into scope:

```manifest
import { Status, Priority } from "./shared/types.manifest"

entity Article {
  property required title: string
  property status: Status = draft
  property priority: Priority = medium
}
```

Import statements support aliasing:

```manifest
import { User as Customer } from "./shared/user.manifest"

entity Order {
  property required buyer: Customer
}
```

The resolver validates import specifiers against the source file's exported symbols (entities, enums, and value objects). Importing a symbol that does not exist, or importing a symbol of the wrong kind, produces a compile error diagnostic.

## Compilation pipeline

<Steps>
  <Step title="Resolution">
    Walk all `use` and `import` declarations starting from the entry file. Build a complete dependency graph using BFS discovery.
  </Step>
  <Step title="Cycle detection">
    Detect circular imports (A imports B imports A) using DFS with grey/black coloring. Circular dependencies produce a compile error diagnostic listing the cycle path.
  </Step>
  <Step title="Topological sort">
    Kahn's algorithm determines the compilation order — dependencies compile before dependents. Ties are broken alphabetically for deterministic output.
  </Step>
  <Step title="Per-file compilation">
    Each file is parsed and compiled to IR independently, producing one IR per file.
  </Step>
  <Step title="Cross-file validation">
    The merged IR is validated for cross-file reference integrity: entity types referenced in properties must exist, enum members used as defaults must be declared, and event names referenced in `emit` must be defined somewhere in the project.
  </Step>
  <Step title="IR merging">
    All per-file IRs are merged into a single output with sorted arrays for determinism. A `sources` array in the IR provenance tracks which files contributed to the merged output.
  </Step>
</Steps>

## CLI flags

Use the `--merge` and `--entry` flags to compile multi-file projects:

```bash
# Compile a multi-file project with merging
manifest compile --merge --entry src/app.manifest

# Compile with explicit output path
manifest compile --merge --entry src/app.manifest --output ir/

# Let the compiler auto-detect entry files (files not referenced by any other)
manifest compile --merge src/
```

| Flag | Description |
|------|-------------|
| `--merge` | Enable multi-file compilation and merge all discovered files into a single IR output |
| `--entry <path>` | Specify the entry point for module resolution. When omitted, the compiler auto-detects root files. |

## Namespace isolation

Each module's entities, events, and enums are namespaced by the module's file path. Two files can define entities with the same name without collision:

```
shared/types.manifest  ->  Status enum  ->  shared/types.Status
domains/order.manifest ->  Order entity ->  domains/order.Order
domains/product.manifest -> Order entity -> domains/product.Order
```

When using `import { X }` syntax, the imported symbol is available without the module prefix in the importing file. The `use` syntax makes all declarations available but with the module prefix for disambiguation.

<Note>
Cross-file validation catches ambiguous references when two modules export the same symbol name. Use the module prefix or an import alias to disambiguate.
</Note>

## Cross-file validation

After merging, the compiler validates cross-file references and produces error diagnostics with file paths and line numbers:

- Entity types referenced in properties must exist in the merged IR
- Enum members used as default values must be declared in an imported or used file
- Event names referenced in `emit` actions must be declared somewhere in the project
- Store declarations must reference entities that exist in the merged IR

Invalid cross-file references produce compile error diagnostics rather than runtime failures.

## ResolverHost abstraction

The module resolver uses a `ResolverHost` abstraction for file system access. In production, this reads from disk. In tests, you can provide an in-memory host to test resolution without touching the file system:

```typescript
import { ModuleResolver } from "@angriff36/manifest/module-resolver";

const resolver = new ModuleResolver({
  readFile(path) {
    // Return file contents from an in-memory map
    return mockFiles.get(path);
  }
});
```

This makes the resolver testable in isolation and allows the multi-compiler to work in environments without direct file system access.

## Complete example

A multi-file project with shared types, domain entities, and an entry point:

```manifest
// shared/types.manifest
enum Status { draft, submitted, approved, rejected }
enum Priority { low, medium, high }
```

```manifest
// domains/order.manifest
use "../shared/types.manifest"

entity Order {
  property required id: string
  property status: Status = draft
  property priority: Priority = medium
  property amount: number = 0

  command submit() {
    guard self.status == draft
    mutate status = submitted
    emit OrderSubmitted
  }
}

event OrderSubmitted: "order.submitted" {
  orderId: string
}

store Order in memory
```

```manifest
// app.manifest
use "./domains/order.manifest"

// Additional top-level declarations can go here
```

Compile the project:

```bash
manifest compile --merge --entry src/app.manifest --output project.ir.json
```

The resulting `project.ir.json` contains all entities, events, enums, and stores from every discovered file, merged into a single deterministic IR with provenance tracking.

See [Entities](/language/entities) for entity declarations, [Events](/language/events) for event schemas, and [CLI overview](/cli/overview) for the full set of compile options.

---

## 📄 Manifest doc — `language/tenancy` · Tenant isolation: scoping reads and writes to a tenant

A top-level `tenant` declaration scopes entity reads and writes to a tenant value extracted from the runtime context. Tenant-scoped programs fail closed: a command invoked without a resolvable tenant value is rejected with `MISSING_TENANT_CONTEXT`.

## Syntax

The declaration is a single top-level construct — at most one per program. The parser rejects more than one tenant declaration:

```manifest
tenant tenantId : string from context.tenantId

entity Invoice {
  property required id: string
  property required amount: number
  property required description: string

  command createInvoice(amount: number, description: string) {
    mutate amount = amount
    mutate description = description
  }

  store in memory
}
```

The syntax is `tenant <property> : <type> from <context_path>`.

## Behavior

The compiler emits an `IRTenant` record with `property`, `type`, and `contextPath` fields onto `IR.tenant`. The field is only present when a `tenant` declaration exists, so programs without tenancy compile identically to before. The runtime engine reads `IR.tenant` and applies tenant scoping:

- **`resolveTenantValue()`** walks the configured `contextPath` (for example `context.tenantId`) against the active runtime context and returns the tenant value, or `undefined` when the IR has no tenant declaration or the context lacks the value.
- The **tenant gate** in `runCommand()` activates when **either** the `requireTenantContext` runtime option is set **or** the IR declares a `tenant`. When active and no tenant value resolves — any falsy value (`undefined`, empty string, `null`) counts as missing — the command fails with `MISSING_TENANT_CONTEXT: tenant-scoped command invoked without context.tenantId`, classified as outcome `missing_tenant_context`.
- On create, the resolved tenant value is auto-written into the entity's tenant property.
- **`getAllInstances()`** filters results to instances whose tenant property equals the active tenant value.
- **`getInstance()`** returns `undefined` when an instance's tenant property does not match the active tenant value, preventing cross-tenant reads.

The Prisma projection adds a tenant discriminator column and an index per model, and emits PostgreSQL row-level-security policy statements as comments for consumers to apply manually.

## Reference

- Source keyword: `tenant`; syntax `tenant <property> : <type> from <context_path>`.
- IR field: `IR.tenant?: IRTenant` with `{ property, type, contextPath }`.
- Runtime option: `requireTenantContext?: boolean` — independent of the IR-level declaration; can enforce tenant context without a `tenant` block.
- Failure diagnostic: `MISSING_TENANT_CONTEXT`, classified as outcome `missing_tenant_context`.

<Warning>
Tenant filtering is enforced by the reference runtime engine's read paths (`getAllInstances`, `getInstance`); it is **not** enforced by the database unless the emitted RLS policies are applied. The Prisma RLS statements ship as comments, not executed migrations.
</Warning>

<Note>
The runtime gate is fail-closed by design — a missing or empty tenant value is treated as an error rather than a permissive default. The `requireTenantContext` option and the IR `tenant` declaration are orthogonal; either activates the gate.
</Note>

---

## 📄 Manifest doc — `language/roles` · Roles: hierarchy and permission inheritance

Roles define named permission sets with single-parent inheritance. A role that extends a parent inherits all its permissions transitively. Use roles with the [policy](/language/guards-policies) system to control command authorization based on the user's assigned role.

## Declaring a role

Use the `role` keyword at the program or module level with a block body of `allow` and `deny` declarations:

```manifest
role User {
  allow read
}

role Manager extends User {
  allow write
  allow execute
}

role Admin extends Manager {
  allow delete
  allow override
  deny impersonate
}
```

Each `allow` or `deny` line names an action (or optionally a target) that the role permits or forbids. The `extends` keyword establishes a single-parent inheritance chain.

## Permission inheritance

Roles inherit permissions transitively through the `extends` chain. The compiler walks the chain from root to leaf, unioning all `allow` permissions along the way:

| Role | Inherited from | Effective permissions |
|------|----------------|----------------------|
| `User` | (none) | read |
| `Manager` (extends User) | User | read, write, execute |
| `Admin` (extends Manager) | Manager, User | read, write, execute, delete, override |

The `effectivePermissions` map is precomputed at compile time by the IR compiler's `resolveRoleGraph()` method. The runtime evaluates these directly via O(1) lookups — no chain traversal happens at execution time.

### Compile-time validation

The compiler validates the role graph and produces error diagnostics for:

- **Duplicate role names**: Each role name must be unique within the program or module.
- **Unknown parent**: A role that extends a name not declared as a role produces a compile error.
- **Circular inheritance**: If the `extends` chain forms a cycle (A extends B extends A), the compiler detects it via DFS coloring and produces an error diagnostic listing the cycle path.

## Deny-is-absolute semantics

If any role in the inheritance chain denies an action, the denial takes precedence over all `allow` rules regardless of where they appear:

```manifest
role Support extends User {
  allow write
  allow execute
  deny delete       // Support CANNOT delete, even if a parent allows it
}
```

Deny rules are applied after the full inheritance union is computed. This means:

1. Walk the inheritance chain and union all `allow` permissions.
2. Walk the inheritance chain and subtract all `deny` permissions.
3. The result is the `effectivePermissions` map.

A `deny` at any level is absolute. There is no mechanism to override a deny with a subsequent allow. This is by design — it prevents privilege escalation through role chain manipulation.

<Warning>
Deny is not a suggestion; it is a hard rule. If `User` denies `impersonate`, then `Admin extends User` cannot re-allow `impersonate`. The deny from `User` will always win. Structure your role hierarchy so that denials only appear at the appropriate level.
</Warning>

## Unknown roles default to deny

If a user's role does not match any declared role, the runtime returns `false` for all permission checks. There are no permissive defaults — an unrecognized role has no permissions. This is consistent with Manifest's default-deny posture. See [Guards and policies](/language/guards-policies) for the broader authorization model.

## Using roles in policies

Reference roles in policy expressions via the `user.role` binding and the built-in permission functions:

```manifest
entity Document {
  default policy RequireAuth execute: user.id != null "Authentication required"

  command approve() {
    policy execute: roleAllows(user.role, "approve") or user.role == "admin"
    mutate status = "approved"
    emit DocumentApproved
  }

  command delete() {
    policy execute: hasPermission(user, "delete")
    mutate status = "deleted"
    emit DocumentDeleted
  }
}
```

## Runtime builtins

Two built-in functions are registered on the runtime engine when roles are present in the IR:

| Function | Signature | Returns |
|----------|-----------|---------|
| `hasPermission` | `hasPermission(user, permission)` | `true` if the user's effective permissions include the named permission |
| `roleAllows` | `roleAllows(roleName, action)` | `true` if the named role's effective permissions allow the action |

Both functions perform O(1) lookups against the precomputed `effectivePermissions` map. The `roleIndex` is built at engine initialization time from the IR's `roles` array.

### `hasPermission(user, permission)`

Checks whether the given user object's role grants the specified permission. Returns `false` if the user has no role, or if the role is not declared in the IR.

```typescript
// Inside a guard or policy expression:
guard hasPermission(user, "delete")
```

### `roleAllows(roleName, action)`

Checks whether a named role allows a specific action, without requiring a user object. Useful for checking whether a role would permit something before assigning it to a user.

```typescript
// Inside a policy expression:
policy execute: roleAllows(user.role, "execute") or user.role == "admin"
```

## Context-sensitive `role` keyword

The `role` keyword is context-sensitive, not a globally reserved keyword. It is emitted as an identifier rather than a reserved token, so existing programs that use `role` as a property name continue to parse correctly:

```manifest
entity UserProfile {
  property role: string = "user"           // property named "role"

  command setRole(newRole: string) {
    mutate role = newRole                   // mutate "role" property
  }
}
```

The parser only treats `role` as a declaration keyword at the top level of a program or module (when followed by an identifier and a block). Inside entity blocks, `role` is an ordinary identifier.

<Note>
The `role` keyword is only treated as a role declaration at the top level of a program or module. Inside entity blocks, `role` is an ordinary identifier. This prevents the keyword from breaking existing code that uses `role` as a property name.
</Note>

## IR representation

Roles are stored in the IR as an optional `roles` array on the root `IR` object (and on `IRModule` for module-scoped roles). Each `IRRole` contains:

```typescript
interface IRRolePermission {
  kind: "allow" | "deny";
  action: string;
  target?: string;
}

interface IRRole {
  name: string;
  extends?: string;
  permissions: IRRolePermission[];
  effectivePermissions: Record<string, boolean>;
  module?: string;
}
```

The `effectivePermissions` field is the precomputed result of inheritance resolution. The runtime reads this field directly and never re-computes it.

## Complete example

```manifest
role User {
  allow read
}

role Manager extends User {
  allow write
  allow execute
}

role Admin extends Manager {
  allow delete
  allow override
  deny impersonate
}

entity Document {
  property required id: string
  property title: string = ""
  property status: string = "draft"

  default policy RequireAuth execute: user.id != null "Authentication required"

  command view() {
    policy execute: hasPermission(user, "read")
    emit DocumentViewed
  }

  command edit(newTitle: string) {
    policy execute: hasPermission(user, "write")
    mutate title = newTitle
    emit DocumentEdited
  }

  command approve() {
    policy execute: roleAllows(user.role, "execute")
    guard self.status == "draft"
    mutate status = "approved"
    emit DocumentApproved
  }

  command delete() {
    policy execute: hasPermission(user, "delete")
    mutate status = "deleted"
    emit DocumentDeleted
  }
}
```

```typescript
import { RuntimeEngine } from "@angriff36/manifest";
import { ir } from "./compiled.ir.json";

// Admin user
const adminRuntime = new RuntimeEngine(ir, {
  user: { id: "admin-1", role: "Admin" },
});

const result = await adminRuntime.runCommand("Document", "delete", {
  instanceId: "doc-42",
});
console.log(result.success); // true

// Manager user
const mgrRuntime = new RuntimeEngine(ir, {
  user: { id: "mgr-1", role: "Manager" },
});

const mgrResult = await mgrRuntime.runCommand("Document", "delete", {
  instanceId: "doc-42",
});
console.log(mgrResult.success); // false (Manager has no "delete" permission)

// Unknown role
const unknownRuntime = new RuntimeEngine(ir, {
  user: { id: "guest-1", role: "Guest" },
});

const unknownResult = await unknownRuntime.runCommand("Document", "view", {
  instanceId: "doc-42",
});
console.log(unknownResult.success); // false (unknown role defaults to deny)
```

See [Guards and policies](/language/guards-policies) for the full policy system, [Commands](/language/commands) for the execution pipeline, and [Approvals](/language/approvals) for multi-stage approval workflows that integrate with role-based policies.

---

## 📄 Manifest doc — `language/types` · Types: enums, decimal/money, value objects, datetime, arrays

Beyond the four primitive types (`string`, `number`, `boolean`, `timestamp`), Manifest offers richer property types for closed value sets, high-precision numbers, reusable composite shapes, points in time, and collections. Type names in Manifest are open strings rather than a closed primitive set, so a custom type name (an enum or a value object) flows through the type system as a reference without a separate validation pass. This page documents what each type actually provides — and, just as importantly, what it does not.

## Enums

A first-class `enum` declaration defines a closed, named set of values that properties can reference. Each member may carry an optional display label and an optional numeric ordinal, giving entities a typed vocabulary for status fields, priorities, and other fixed value sets.

Enums are top-level declarations:

```manifest
enum Status {
  draft
  published = "Published"
  archived(2)
}

entity Article {
  property required title: string
  property status: Status = draft
  property priority: Priority
}

enum Priority {
  low = "Low Priority"
  medium = "Medium Priority"
  high = "High Priority"
}

store Article in memory
```

A member written as `name` is a plain value; `name = "Label"` attaches a display label; `name(ordinal)` attaches a numeric ordinal. The three forms can be mixed freely within one enum. An enum may be referenced as a property type before or after its own declaration in the file, and a property default such as `= draft` refers to a member by name.

The IR carries the full enum definition — a `name`, optional `module`, and a `values` array where each value records its `name` and, only when present, a `label` and an `ordinal`. Absent metadata is omitted rather than defaulted, so the IR stays minimal. This representation is the input downstream projections use to emit database enum columns and TypeScript union types.

<Warning>
The IR carries only `name`, `label`, and `ordinal` per member. There is **no** enum-specific reference checker in the compiler and **no** transition-constraint machinery on enum members — both are aspirational, not present in the source. Because type names are not a closed set, referencing an undeclared enum name as a property type is not rejected at compile time by the enum machinery itself.
</Warning>

## Decimal and money

The `decimal` and `money` types represent high-precision numbers with optional precision and scale parameters, intended for monetary amounts and other values where binary floating point is unacceptable.

Both types accept an optional `(precision, scale)` parameter list and can otherwise be used like any scalar:

```manifest
entity Invoice {
  property required description: string
  property amount: decimal(10, 2) = 0
  property tax: money(12, 4) = 0
  property total: decimal = 0
  property optionalFee: money?
}

store Invoice in memory
```

`decimal(10, 2)` declares 10 total digits with 2 fractional digits. `money(12, 4)` is the same shape with higher precision. Both types are valid without parameters (`decimal`, `total`), in which case no precision or scale is recorded. The `?` suffix makes the property nullable (`money?`).

The parser special-cases a `(` immediately after the type name only when the name is `decimal` or `money` — any other type name followed by `(` is not treated as parameterized. When present, the precision and scale are stored as a `params` object on the emitted `IRType`; unparameterized types produce no `params`. This `params` object is the input a projection would consume to emit, for example, a Postgres `NUMERIC` column or a `Decimal.js` field.

<Warning>
`decimal` and `money` do **not** introduce runtime arithmetic or validation of their own. The runtime engine treats their values as ordinary numbers — there is no decimal arithmetic library wired into the evaluator, and precision/scale are metadata carried for projection use, **not enforced at runtime or at compile time**. Any high-precision guarantee depends on a downstream projection rather than the reference runtime.
</Warning>

## Value objects

A `value` declaration defines a reusable composite type that embeds inline in entity properties rather than living in its own table. Value objects group related fields — money, addresses — into a single named shape that several entities can share.

Value objects are top-level declarations containing only property declarations:

```manifest
value Money {
  property amount: decimal
  property currency: string
}

value Address {
  property street: string
  property city: string
  property country: string
}

entity Product {
  property required id: string
  property name: string
  property price: Money
  property billingAddress: Address
}

entity Order {
  property required id: string
  property total: Money
  property shippingAddress: Address
}

store Product in memory
store Order in memory
```

An entity references a value object by using its name as a property type (`price: Money`). The same value object can be embedded in multiple entities.

The `value` token is context-sensitive — it is emitted as an identifier rather than a reserved keyword, so `property value: number` and `mutate value = 1` continue to parse without reserved-word errors. Every compiled program carries a top-level `values` array (empty when none are declared), and a property whose type name matches a declared value object is identified by checking that name against `ir.values`. The code generator emits a TypeScript interface for each value object, and the Prisma projection emits a matching property as a `Json` (JSONB) column rather than a foreign-key relationship or a separate table.

<Note>
Value objects are described as "immutable by design," but that is a design statement, not a runtime-enforced property: the reference runtime does not freeze or reject mutation of embedded value data, and there is no immutability check in the compiler or engine. Value object bodies are restricted to properties — relationships, commands, and other members are rejected by the parser.
</Note>

## Datetime

Manifest represents points in time with the `datetime` type and offers UTC-based date-component built-ins for extracting parts of a timestamp.

There is **no** dedicated `date`, `time`, `duration`, or `interval` primitive type — those keywords are not in the lexer. The date type the runtime and projections work with is `datetime`, used like any scalar property type. The most common way `datetime` properties appear is via the `timestamps` modifier, which injects `createdAt` and `updatedAt`:

```manifest
entity Article {
  property required title: string
  timestamps
}
```

Because type names are open strings, a property may also be declared `property scheduledFor: datetime` and will compile, but no date-specific parsing or validation is attached to such a declaration.

Date components are read at runtime through expression built-ins operating on a numeric millisecond timestamp:

```manifest
entity DateUtils {
  property required id: string
  property baseTs: number = 0

  computed extractedYear: number = year(self.baseTs)
  computed extractedMonth: number = month(self.baseTs)
  computed extractedDay: number = day(self.baseTs)
  computed extractedHours: number = hours(self.baseTs)
  computed extractedMinutes: number = minutes(self.baseTs)
  computed extractedSeconds: number = seconds(self.baseTs)
}
```

The date built-ins all operate on a number interpreted as milliseconds since the epoch and return a UTC component:

- `year(ts)` returns `getUTCFullYear()`.
- `month(ts)` returns `getUTCMonth() + 1` (so January is 1, not 0).
- `day(ts)` returns `getUTCDate()`.
- `hours(ts)`, `minutes(ts)`, `seconds(ts)` return the corresponding UTC components.

Each returns the input unchanged when it is not a number. UTC methods are used deliberately so results are timezone-independent and deterministic.

<Warning>
This is the most significant area of overclaiming to avoid. There are **no** `Date`, `Time`, `Duration`, or `Interval` primitive types, no date column mappings for them, and no date arithmetic, comparison, or formatting built-ins beyond component extraction. What genuinely exists is the `datetime` type (notably via `timestamps`) and the six UTC date-component built-ins above.
</Warning>

## Arrays

Array properties hold multiple scalar values in a single field, distinct from relationships (which model collections of entities). They are declared with either postfix `[]` sugar or explicit `array<T>` generic syntax.

```manifest
entity TaggedDocument {
  property required id: string
  property tags: string[] = []
  property scores: array<number> = []

  constraint noEmptyTags: self.tags.length > 0
  constraint hasTags: self.tags.contains("published")
}

store TaggedDocument in memory
```

`string[]` and `array<string>` are equivalent. An empty array literal `[]` is a valid default. Constraints can reach into array values with member access such as `self.tags.length` and method-style calls like `self.tags.contains("published")`.

Both forms normalize to an `array` type carrying a `generic` element type in the AST and IR. Array element types may themselves carry parameters — because the inner type goes through the same type parser, the generic element preserves details like decimal precision where applicable. The normalized `array` IR type is the structural input projections consume to emit PostgreSQL array/JSONB columns or Zod array schemas.

<Note>
The `.length` and `.contains(...)` helpers are expression-level operations rather than dedicated array constraint primitives. The two constraints above are independently evaluated rather than short-circuited, so both can register failures. Array properties are scalar-valued collections and are deliberately separate from `hasMany` relationships, which model entity collections.
</Note>

## Maps / Records

The `map<K, V>` type declares a key-value dictionary property where all keys are of type `K` and all values are of type `V`. Use it for dynamic metadata, localization tables, or configuration objects.

```manifest
entity Product {
  property required id: string
  property name: string
  property metadata: map<string, string> = {}
  property translations: map<string, string> = {}
  property featureFlags: map<string, boolean> = {}
}

store Product in memory
```

The `map<K, V>` syntax and the alternative `record<K, V>` syntax are equivalent — both normalize to the same IR type. Key types are restricted to `string` and `number`. Value types can be any scalar type.

Access map values in expressions using member access:

```manifest
constraint hasEnglishName: self.translations["en"] != ""

computed flagEnabled: self.featureFlags["beta-feature"] == true
```

<Note>
Map properties are persisted as JSON objects in projections (e.g., Prisma `Json` column, Drizzle `jsonb`). The runtime does not enforce key or value types beyond what JavaScript provides — type safety is a projection concern.
</Note>

---

## 📄 Manifest doc — `language/advanced-entities` · Advanced entities: inheritance, mixins, and generics

Manifest supports three patterns for structuring entity types beyond a flat declaration: single inheritance with `extends`, composition with `mixin`, and parameterized templates with generics. All three are compile-time features — the runtime sees a flattened entity with no inheritance metadata.

## Entity inheritance (`extends`)

An entity can inherit properties, computed properties, constraints, commands, and policies from a single parent entity using the `extends` keyword:

```manifest
entity BaseEntity {
  property required id: string
  timestamps
}

entity Product extends BaseEntity {
  property required name: string
  property price: number = 0

  command updatePrice(newPrice: number) {
    guard newPrice >= 0
    mutate price = newPrice
  }
}

store Product in memory
```

`Product` inherits the `id` property and `timestamps` from `BaseEntity`. The compiled IR contains a single flattened `Product` entity with all inherited members — there is no runtime polymorphism.

### Overriding inherited members

Child entities can override inherited properties and commands by redeclaring them with the same name. The child's declaration takes precedence.

### Cycle detection

The compiler detects circular inheritance chains (e.g., `A extends B` and `B extends A`) and emits an error diagnostic. Cycles are also caught transitively (A → B → C → A).

<Note>
Only single inheritance is supported. An entity can extend exactly one parent. For sharing behavior across multiple entities, use mixins or generic templates.
</Note>

## Mixin composition

Mixins inject reusable property and constraint declarations into an entity without creating a parent-child relationship. Declare a mixin with the `mixin` keyword and apply it inside an entity block:

```manifest
mixin Auditable {
  property required createdBy: string
  property required updatedBy: string
}

mixin SoftDeletable {
  property deletedAt: number = 0
  constraint notDeleted: self.deletedAt == 0
}

entity Document {
  mixin Auditable
  mixin SoftDeletable

  property required title: string
  property content: string = ""
}

store Document in memory
```

`Document` receives all properties and constraints from both `Auditable` and `SoftDeletable`. Mixins can be applied to any number of entities.

### Combining extends and mixins

An entity can both extend a parent and apply mixins:

```manifest
entity ArchivedDocument extends BaseEntity {
  mixin Auditable
  mixin SoftDeletable

  property required title: string
}
```

Members are resolved in this order: entity's own declarations → applied mixins → inherited parent members. Conflicts (same name from multiple mixins) produce a compile error.

## Generic / parameterized entities

Generic entities define a template with type parameters that are instantiated at compile time. This lets you build reusable patterns like paginated collections, versioned records, or typed wrappers:

```manifest
entity Paginated<T> {
  property required items: T[]
  property total: number = 0
  property page: number = 1
  property pageSize: number = 20

  computed hasNextPage: number = self.total > self.page * self.pageSize
}
```

### Instantiation

Generic entities are instantiated by providing concrete type arguments:

```manifest
entity ProductList : Paginated<Product> {
  // additional members specific to product listings
}
```

The compiler substitutes `T` with `Product` throughout the generic body, producing a concrete entity with fully resolved types.

### Arity validation

The compiler checks that the number of type arguments matches the generic's declaration. Providing too few or too many type arguments produces an error diagnostic.

<Warning>
Generic entity types are a compile-time-only feature. The IR contains the fully instantiated (monomorphized) entity — no type parameters survive into the runtime. This means you cannot create generic entity instances dynamically at runtime.
</Warning>

## IR representation

All three features are resolved at compile time. The emitted IR contains:

- **Inheritance**: A single flattened `IREntity` with all inherited members. The `extends` relationship is not preserved in the IR.
- **Mixins**: Same as inheritance — members are inlined into the entity. Mixin names are not recorded.
- **Generics**: The instantiated entity with concrete type substitutions. The generic template itself is not emitted to IR.

This means downstream projections and the runtime engine see no inheritance, mixin, or generic metadata — they operate on flat, fully resolved entities only.

---
