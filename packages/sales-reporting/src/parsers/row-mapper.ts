import { SalesRecord } from '../types';

const STATUS_MAP: Record<string, SalesRecord['status']> = {
  won: 'won',
  closed: 'won',
  'closed won': 'won',
  lost: 'lost',
  'closed lost': 'lost',
  pending: 'pending',
  open: 'pending',
  proposal_sent: 'proposal_sent',
  'proposal sent': 'proposal_sent',
  proposed: 'proposal_sent',
};

function parseDate(value: string | undefined): Date | null {
  if (!value || value.trim() === '') return null;
  const d = new Date(value.trim());
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeStatus(raw: string): SalesRecord['status'] {
  const normalized = raw.trim().toLowerCase().replace(/[-\s]+/g, '_');
  return STATUS_MAP[normalized] ?? 'pending';
}

export function parseRowToRecord(row: Record<string, string>): SalesRecord | null {
  const dateStr = row.date || row.record_date || row.entry_date;
  const date = parseDate(dateStr);
  if (!date) return null;

  return {
    date,
    eventName: row.event_name || row.deal_name || row.opportunity || '',
    eventType: row.event_type || row.type || row.category || '',
    clientName: row.client_name || row.customer || row.client || '',
    leadSource: row.lead_source || row.source || row.channel || '',
    status: normalizeStatus(row.status || ''),
    proposalDate: parseDate(row.proposal_date || row.proposed_date),
    closeDate: parseDate(row.close_date || row.closed_date),
    revenue: parseNumber(row.revenue || row.amount || row.value || row.deal_value),
    eventDate: parseDate(row.event_date || row.delivery_date),
  };
}
