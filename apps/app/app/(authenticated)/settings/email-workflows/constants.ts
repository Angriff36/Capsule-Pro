export type EmailTriggerType = email_trigger_type;

export const TRIGGER_TYPE_LABELS: Record<EmailTriggerType, string> = {
  event_confirmed: "Event Confirmed",
  event_canceled: "Event Canceled",
  event_completed: "Event Completed",
  task_assigned: "Task Assigned",
  task_completed: "Task Completed",
  task_reminder: "Task Reminder",
  shift_reminder: "Shift Reminder",
  proposal_sent: "Proposal Sent",
  contract_signed: "Contract Signed",
  contract_expiration: "Contract Expiration",
  custom: "Custom Trigger",
};

export const TRIGGER_TYPE_GROUPS: {
  label: string;
  types: EmailTriggerType[];
}[] = [
  {
    label: "Event Triggers",
    types: ["event_confirmed", "event_canceled", "event_completed"],
  },
  {
    label: "Task Triggers",
    types: ["task_assigned", "task_completed", "task_reminder"],
  },
  {
    label: "Staff Triggers",
    types: ["shift_reminder"],
  },
  {
    label: "Sales Triggers",
    types: ["proposal_sent", "contract_signed", "contract_expiration"],
  },
  {
    label: "Custom",
    types: ["custom"],
  },
];
