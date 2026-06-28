# integrations/

Canonical area — **external systems + infra** (database, auth, ci, deployment, …).

One subfolder per integration; each gets canonical units created on demand from [`../_templates/canonical-unit.md`](../_templates/canonical-unit.md). Append a row to [`../INDEX.md`](../INDEX.md) for each unit.

> **Before adding here:** `cd canonical && treex` to see what already exists. Do not grep — an integration named differently won't match your search and you'll create a duplicate.
