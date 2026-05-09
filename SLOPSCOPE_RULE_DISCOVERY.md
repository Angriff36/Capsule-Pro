# SlopScope Rule Discovery

---
## [2026-05-08 14:25] Rule Discovery — skeleton_crud.success_response_with_not_implemented_body

### Finding
The `GET /api/command-board/templates` route returns `manifestSuccessResponse` (HTTP 200) with an empty `templates` array and a body message stating "Template listing not yet implemented". The file header (line 5) claims the endpoint "returns 501 Not Implemented" — the code directly contradicts its own documentation. A proper 501 would signal unavailability to callers and monitoring; a 200 with empty data silently presents as "no templates exist" to any consuming UI.

### Evidence
- File: `app/api/command-board/templates/route.ts`
- Snippet (lines 4-5, 36-40):
```
 * NOTE: CommandBoard model does not have shareId, isPublic fields.
 * This endpoint returns 501 Not Implemented until the model is updated.
 ...
    return manifestSuccessResponse({
      templates: [],
      message:
        "Template listing not yet implemented - CommandBoard model needs shareId and isPublic fields",
    });
```

### Why this matters
Any UI consuming this endpoint sees HTTP 200 with `templates: []` and renders "no templates" rather than surfacing that the feature is unavailable. Standard monitoring (status-code-based alerting) cannot detect this — the response looks healthy. The user assumes they just haven't created templates yet, when in reality the feature doesn't exist. This is more insidious than a proper 501 because it silently degrades the UX.

### Proposed detector rule
```json
{
  "id": "skeleton_crud.success_response_with_not_implemented_body",
  "title": "API route returns success HTTP status but response body says feature is not implemented",
  "category": "skeleton_crud",
  "severity": "medium",
  "confidence": 0.85,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript", "tsx"],
  "pattern": "not yet implemented",
  "negative_patterns": [],
  "evidence_required": {
    "file_must_match": ["app/api/.*/route\\.(t|j)sx?$"],
    "file_must_not_match": ["\\.(test|spec)\\.(t|j)sx?$|__tests__/|test/"],
    "min_pattern_count": 1,
    "companion_pattern": "manifestSuccessResponse|NextResponse\\.json\\(|return\\s+new\\s+Response\\("
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": true,
    "path_exclude": ["node_modules/", "\\.next/", "dist/", "build/", "coverage/", "__tests__/", "test/"]
  },
  "user_impact": "Consuming UI receives HTTP 200 with empty data and silently renders 'no items' instead of alerting the user that the feature is unavailable. Standard HTTP-status monitoring cannot detect this.",
  "repair_guidance": "Either (a) change the response to 501 with a clear error message so callers and monitoring detect unavailability, or (b) implement the actual database query and remove the 'not yet implemented' message. If blocked on a schema migration, return 503 with a meaningful error payload.",
  "example_source": {
    "file": "app/api/command-board/templates/route.ts",
    "line_or_snippet": "return manifestSuccessResponse({\n  templates: [],\n  message:\n    \"Template listing not yet implemented - CommandBoard model needs shareId and isPublic fields\",\n});"
  }
}
```

### Implementation note
This detector should run on API route files and flag any response body containing "not yet implemented" (or "not implemented") paired with a success-status return pattern (`manifestSuccessResponse`, `NextResponse.json`, `new Response`). The scanner must strip comments before matching to avoid flagging header-doc comments that honestly document the 501 intent. The companion pattern distinguishes deceptive 200 responses from honest 501 endpoints (which use `manifestErrorResponse` or pass an explicit error status).
---
