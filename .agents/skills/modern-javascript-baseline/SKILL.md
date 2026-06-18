---
name: modern-javascript-baseline
description: Guides when to use ES2025–ES2027 baseline JavaScript APIs (Set union/intersection, iterator helpers, Promise.try, import attributes, RegExp.escape, Array.fromAsync, Error.isError, Map.getOrInsert, Math.sumPrecise, using/await using, Temporal). Use when writing or reviewing JS/TS, replacing manual set/array patterns, or choosing modern built-ins over lodash/helpers.
disable-model-invocation: true
---

# Modern JavaScript Baseline (ES2025–ES2027)

Prefer these built-ins over hand-rolled equivalents when the runtime target supports them (Node 22+, modern browsers). Do not add polyfills unless the project's browserslist/engines explicitly requires older runtimes.

## Decision matrix

| API | Baseline | Use when | Replace this |
|-----|----------|----------|--------------|
| `Set` set-theory methods | ES2025 | Any set operation on iterables | `filter`+`includes`, manual loops, lodash set ops |
| Iterator helpers | ES2025 | Lazy chains on generators/async iterables; infinite sequences | Eager `[...gen].filter()` (unsafe on infinite) |
| `Promise.try` | ES2025 | Callback may **sync-throw** or return a rejected promise | `try/catch` inside `.then()` |
| Import attributes | ES2025 | Static/dynamic JSON import in ESM | bundler-only JSON imports without `with { type: "json" }` |
| `RegExp.escape` | ES2025 | User input → dynamic `RegExp` | Manual escaping / broken dot-star bugs |
| `Array.fromAsync` | ES2026 | Async iterables, paginated fetch generators, streams | Manual `for await` + push |
| `Error.isError` | ES2026 | Cross-realm / iframe error checks | `instanceof Error` alone |
| `Map.getOrInsert` / `getOrInsertComputed` | ES2026 | Incremental map build with defaults | `if (!map.has(k)) map.set(k, …)` |
| `Math.sumPrecise` | ES2026 | Summing floats where rounding matters | `reduce((a,b)=>a+b)` on decimals |
| `using` / `await using` | ES2027 | Resources needing deterministic cleanup | Nested `try/finally` for dispose |
| `Temporal` | ES2027 | Dates, times, zones, durations (no Date hacks) | `Date`, moment, date-fns for new code |

**Support caveats (May 2026):** `using`, `Temporal` — Safari lagging (~67–70% global). `Map.getOrInsert`, `Math.sumPrecise` — major browsers current; roll out confidently on server/controlled clients. Polyfill Temporal/`using` only when product requires Safari without updates.

---

## ES2025

### Set methods (non-mutating)

```javascript
const a = new Set([1, 2, 3, 4]);
const b = new Set([3, 4, 5, 6]);

a.union(b);              // {1,2,3,4,5,6}
a.intersection(b);       // {3,4}
a.difference(b);         // {1,2}
a.symmetricDifference(b);// {1,2,5,6}
a.isSubsetOf(b);         // boolean
a.isSupersetOf(b);
a.isDisjointFrom(b);
```

**When:** deduping merges, permission sets, tag intersections, “items in both lists.” Argument can be **any iterable** (array OK): `evens.intersection([3,4,5,6])`.

**Avoid:** `arr1.filter(x => arr2.includes(x))` for set logic.

### Iterator helpers (lazy)

```javascript
function* numbers() { let i = 0; while (true) yield i++; }

numbers()
  .filter(n => n % 2 === 0)
  .map(n => n * n)
  .take(5)
  .toArray(); // [0, 4, 16, 36, 64]

[1,2,3,4,5,6,7,8].values().filter(n => n % 2 === 0).map(n => n * n).toArray();
```

**When:** generators, large/paginated sequences, **stop early** (`take`/`drop`). Methods: `map`, `filter`, `take`, `drop`, `flatMap`, `reduce`, `forEach`, `some`, `every`, `find`, `toArray`.

**Avoid:** spreading infinite iterables into arrays before filtering.

### Promise.try

```javascript
Promise.try(() => {
  if (!userId) throw new Error("No user ID");
  return fetch(`/api/users/${userId}`).then(r => r.json());
})
  .then(user => …)
  .catch(err => …); // sync throws AND rejections
```

**When:** unified error path for sync + async failure. `.catch()` on a bare `.then(() => fn())` does **not** catch sync throws inside `fn`.

### Import attributes

```javascript
import config from "./config.json" with { type: "json" };
const data = await import("./data.json", { with: { type: "json" } });
```

**When:** native ESM JSON (security: MIME must match). JSON only for now.

### RegExp.escape

```javascript
const pattern = new RegExp(RegExp.escape(userQuery), "i");
```

**When:** any user-controlled search regex. Unescaped `.` matches any character.

---

## ES2026

### Array.fromAsync

```javascript
const allItems = await Array.fromAsync(fetchPages("/api/items"));
```

**When:** async generators, paginated APIs, async iterables. Same role as `Array.from` for sync iterables.

### Error.isError

```javascript
Error.isError(err); // true for Error, TypeError, etc.; realm-safe
```

**When:** generic catch blocks, logging, API boundaries. Prefer over `instanceof Error` when value may cross iframes/workers.

### Map.getOrInsert / getOrInsertComputed

```javascript
const arr = map.getOrInsert(key, []); // inserts [] if missing
const set = map.getOrInsertComputed(key, () => new Set()); // lazy default
```

**When:** grouping (`Map<string, T[]>`), caches, adjacency lists. Use **Computed** when default is expensive (default arg is always evaluated for `getOrInsert`).

### Math.sumPrecise

```javascript
Math.sumPrecise([0.1, 0.2, 0.3]); // 0.6
```

**When:** money-like sums, reporting totals. Not for every `+` — only when FP drift is user-visible.

---

## ES2027

### Explicit resource management (`using`)

```javascript
function runQuery() {
  using conn = new DatabaseConnection();
  conn.connect();
  return conn.query("SELECT * FROM users");
  // conn[Symbol.dispose]() runs at scope exit
}

async function processFile() {
  await using file = await openFile("data.txt");
  return await file.read();
  // await file[Symbol.asyncDispose]()
}
```

**When:** DB connections, file handles, timers, listeners — anything with a dispose hook. TypeScript supports today; verify browser target for client code.

### Temporal

```javascript
const birthday = Temporal.PlainDate.from("1990-05-15");
const today = Temporal.Now.plainDateISO();
const age = birthday.until(today, { largestUnit: "years" });
```

**When:** new date/time logic (zones, durations, plain dates). Prefer polyfill if Safari unsupported. Do not reach for `Date` + manual math for new features.

---

## Agent checklist

Before implementing a manual pattern, ask:

1. **Set logic?** → `Set` methods  
2. **Lazy / infinite / generator?** → iterator helpers + `take`  
3. **Sync throw in promise chain?** → `Promise.try`  
4. **JSON in ESM?** → import attributes  
5. **User string → RegExp?** → `RegExp.escape`  
6. **Async iterable → array?** → `Array.fromAsync`  
7. **Is this an Error?** → `Error.isError`  
8. **Map default-on-miss?** → `getOrInsert(Computed)`  
9. **Decimal sum?** → `Math.sumPrecise`  
10. **Needs cleanup?** → `using` / `await using`  
11. **Calendar math?** → `Temporal` (with polyfill if needed)

Match project `engines` / browserslist before using ES2027 client-side features.
