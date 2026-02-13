# Timecard Approval Workflow

## Outcome
Managers can review, edit, and approve/reject timecards through a multi-step approval process. The system tracks approval history and supports bulk approval for efficiency.

## In Scope
- Review timecards with details (hours, breaks, location, photos)
- Edit timecard details before approval (with reason recorded)
- Approve or reject timecards individually or in bulk
- Track approval history (who approved, when, any edits made)
- Require approval before timecards are included in payroll
- Support multiple approval levels if configured

## Out of Scope
- Automatic approval based on rules
- Integration with external approval systems
- Timecard dispute resolution workflows
- Approval analytics or reporting

## Invariants / Must Never Happen
- Timecards must never be included in payroll without approval
- Approved timecards must never be editable without proper authorization
- Approval history must never be deleted or modified
- Timecards must never be approved by users without proper permissions
- Bulk approval must never approve timecards the user doesn't have permission to approve
- Timecard edits during approval must never be lost

## Acceptance Checks
- Review timecard → see all details including photos and location
- Edit timecard → changes saved with reason, approval history updated
- Approve timecard → status changes to approved, included in payroll
- Reject timecard → status changes to rejected, employee notified
- Bulk approve timecards → all selected timecards approved
- View approval history → shows who approved, when, and any edits made
