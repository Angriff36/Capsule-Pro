# Contract Management System

## Outcome
Users can store, track, and manage event contracts with signature capture, status tracking, and expiration alerts. Contracts link to events and clients for complete relationship management.

## In Scope
- Create contracts linked to events and clients
- Upload contract documents (PDF, images)
- Capture electronic signatures
- Track contract status (draft, sent, signed, expired, canceled)
- Set expiration dates and receive alerts
- View contract history and versions

## Out of Scope
- Contract template creation or management
- Integration with external contract systems
- Contract negotiation workflows
- Contract analytics or reporting

## Invariants / Must Never Happen
- Contracts must never be deleted if linked to active events
- Contract signatures must never be forged or modified
- Contract status must never be changed incorrectly (e.g., signed back to draft)
- Contract expiration alerts must never be missed
- Contracts must never be visible to users from other tenants
- Contract documents must never be lost or corrupted

## Acceptance Checks
- Create contract → contract created and linked to event/client
- Upload contract document → document stored and accessible
- Capture signature → signature recorded and contract status updated
- Set expiration date → alert received before expiration
- View contract status → shows current status and history
- Attempt to delete contract with active event → warning shown
