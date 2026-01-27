// Core event data types for parsing and auto-fill

export type TimelinePhase = 'setup' | 'service' | 'teardown' | 'other';

export interface EventTimelineEntry {
  label: string;
  time?: string;
  endTime?: string;
  minutes?: number;
  endMinutes?: number;
  description?: string;
  phase: TimelinePhase;
  raw: string;
}

export interface EventContact {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface EventVenue {
  name: string;
  address: string;
  geo?: { lat: number; lng: number };
}

export interface EventTimes {
  start: string;
  end: string;
}

export interface MenuQuantityDetail {
  value: number;
  unit: string;
  label?: string;
  raw?: string;
}

export type ServiceLocation =
  | 'finish_at_event'
  | 'finish_at_kitchen'
  | 'drop_off'
  | 'action_station'
  | 'other';

export interface MenuItem {
  category: string;
  categoryPath?: string[];
  group?: string;
  serviceLocation?: ServiceLocation;
  badges?: string[];
  sortOrder?: number;
  name: string;
  rawName?: string;
  qty: {
    value: number;
    unit: string;
  };
  quantityDetails?: MenuQuantityDetail[];
  warnings?: string[];
  allergens: string[];
  specials: string[];
  preparationNotes?: string;
}

export interface StaffShift {
  name: string;
  position: string;
  scheduledIn: string;
  scheduledOut: string;
  scheduledHours: number;
  actualHours?: number;
  rate: number;
  tasks?: string[];
}

export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Flag {
  code: string;
  severity: FlagSeverity;
  message: string;
  evidenceRef: string[];
  autoResolution?: string;
  resolved: boolean;
}

export type EvidenceType = 'extraction' | 'validation' | 'inference';

export interface Evidence {
  id: string;
  type: EvidenceType;
  source: string;
  data: unknown;
  confidence: number;
  timestamp: string;
}

export type EventStatus = 'draft' | 'validated' | 'approved' | 'completed';

export interface ParsedEvent {
  id: string;
  number: string;
  client: string;
  date: string;
  venue: EventVenue;
  times: EventTimes;
  headcount: number;
  serviceStyle: string;
  kits: string[];
  menuSections: MenuItem[];
  allergens: string[];
  keyContacts?: EventContact[];
  notes?: string[];
  timeline?: EventTimelineEntry[];
  rawTimeline?: string[];
  staffing: StaffShift[];
  flags: Flag[];
  evidence: Evidence[];
  status: EventStatus;
}

export interface ParsedEventResult {
  event: ParsedEvent;
  warnings: string[];
  flags: Flag[];
  reviewItems: string[];
  confidence: number;
}

export interface ParsedFile {
  id: string;
  name: string;
  type: 'pdf' | 'csv';
  size: number;
  parsedAt: string;
  extractedData: unknown;
  confidence: number;
  errors: string[];
}

export interface ReviewQueueItem {
  id: string;
  eventId: string;
  type: 'validation' | 'ambiguity' | 'conflict';
  issue: string;
  suggestedResolution?: string;
  requiresHuman: boolean;
  priority: number;
}
