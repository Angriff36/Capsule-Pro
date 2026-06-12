// Core event data types for parsing and auto-fill

export type TimelinePhase = "setup" | "service" | "teardown" | "other";

export interface EventTimelineEntry {
  description?: string;
  endMinutes?: number;
  endTime?: string;
  label: string;
  minutes?: number;
  phase: TimelinePhase;
  raw: string;
  time?: string;
}

export interface EventContact {
  email?: string;
  name: string;
  notes?: string;
  phone?: string;
  role?: string;
}

export interface EventVenue {
  address: string;
  geo?: { lat: number; lng: number };
  name: string;
}

export interface EventTimes {
  end: string;
  start: string;
}

export interface MenuQuantityDetail {
  label?: string;
  raw?: string;
  unit: string;
  value: number;
}

export type ServiceLocation =
  | "finish_at_event"
  | "finish_at_kitchen"
  | "drop_off"
  | "action_station"
  | "other";

export interface MenuItem {
  allergens: string[];
  badges?: string[];
  category: string;
  categoryPath?: string[];
  group?: string;
  name: string;
  preparationNotes?: string;
  qty: {
    value: number;
    unit: string;
  };
  quantityDetails?: MenuQuantityDetail[];
  rawName?: string;
  serviceLocation?: ServiceLocation;
  sortOrder?: number;
  specials: string[];
  warnings?: string[];
}

export interface StaffShift {
  actualHours?: number;
  name: string;
  position: string;
  rate: number;
  scheduledHours: number;
  scheduledIn: string;
  scheduledOut: string;
  tasks?: string[];
}

export type FlagSeverity = "low" | "medium" | "high" | "critical";

export interface Flag {
  autoResolution?: string;
  code: string;
  evidenceRef: string[];
  message: string;
  resolved: boolean;
  severity: FlagSeverity;
}

export type EvidenceType = "extraction" | "validation" | "inference";

export interface Evidence {
  confidence: number;
  data: unknown;
  id: string;
  source: string;
  timestamp: string;
  type: EvidenceType;
}

export type EventStatus = "draft" | "validated" | "approved" | "completed";

export interface ParsedEvent {
  allergens: string[];
  client: string;
  date: string;
  evidence: Evidence[];
  flags: Flag[];
  headcount: number;
  id: string;
  keyContacts?: EventContact[];
  kits: string[];
  menuSections: MenuItem[];
  notes?: string[];
  number: string;
  rawTimeline?: string[];
  serviceStyle: string;
  staffing: StaffShift[];
  status: EventStatus;
  timeline?: EventTimelineEntry[];
  times: EventTimes;
  venue: EventVenue;
}

export interface ParsedEventResult {
  confidence: number;
  event: ParsedEvent;
  flags: Flag[];
  reviewItems: string[];
  warnings: string[];
}

export interface ParsedFile {
  confidence: number;
  errors: string[];
  extractedData: unknown;
  id: string;
  name: string;
  parsedAt: string;
  size: number;
  type: "pdf" | "csv";
}

export interface ReviewQueueItem {
  eventId: string;
  id: string;
  issue: string;
  priority: number;
  requiresHuman: boolean;
  suggestedResolution?: string;
  type: "validation" | "ambiguity" | "conflict";
}
