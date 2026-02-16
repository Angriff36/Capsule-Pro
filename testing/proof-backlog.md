# Proof Backlog

These are claims we still need to prove with executable evidence.

## P0 (Blockers)

1. End-to-end HTTP route execution in real Next.js environment.
2. Real auth mode behavior (not `authProvider:"none"`).
3. Failure branches: policy denial (403), guard failure (422), malformed input (400).
4. Database-backed mutation safety (transactions and rollback behavior).

## P1 (Important)

1. Coverage across all key commands, not just a single command path.
2. Coverage across multiple entities, not single-entity proofs.
3. Event shape and ordering stability in mutation flows.
4. CLI error handling and invalid-input behavior.

## P2 (Quality)

1. Snapshot update/change-management process.
2. Multi-constraint scenarios (`warn` + `block` interactions).
3. Performance/load behavior for generated routes.
4. Security hardening checks for payload hygiene and identity injection.
