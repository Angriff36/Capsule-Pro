# SlopScope Rule Implementation Plan

- [ ] skeleton_crud.success_response_with_not_implemented_body — API route returns success HTTP status but response body says feature is not implemented
  - Category: skeleton_crud
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: app/api/command-board/templates/route.ts
  - Future implementation: Add regex detector that flags "not yet implemented" in route files where the companion pattern (manifestSuccessResponse/NextResponse.json) indicates a success response rather than an honest 501
