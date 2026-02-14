# Claim 002: End-to-End HTTP Route Execution Is Correct

## Claim

Generated or embedded Manifest-backed routes execute correctly end-to-end in a real Next.js environment.

## Why It Matters

Unit and static checks are insufficient without real request/response execution.

## Preconditions

- Next.js app running with route mounted.
- Auth and tenant context available.
- Test data seeded.

## Pass Criteria

- Successful authenticated request returns expected shape/data.
- Failure branches return expected status codes and structured errors.
- Mutation paths persist expected state changes.

## Commands To Run

```bash
# TODO: define exact app start + request commands for this repo
```
