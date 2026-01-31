// Core event data types for parsing and auto-fill

export type TimelinePhase = "setup" | "service" | "teardown" | "other";

export type EventTimelineEntry = {
  label: string;
  time?: string;
  endTime?: string;
  minutes?: number;
  endMinutes?: number;
  description?: string;
  phase: TimelinePhase;
  raw: string;
};

export type EventContact = {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type EventVenue = {
  name: string;
  address: string;
  geo?: { lat: number; lng: number };
};

export type EventTimes = {
  start: string;
  end: string;
};

export type MenuQuantityDetail = {
  value: number;
  unit: string;
  label?: string;
  raw?: string;
};

export type ServiceLocation =
  | "finish_at_event"
  | "finish_at_kitchen"
  | "drop_off"
  | "action_station"
  | "other";

export type MenuItem = {
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
};

export type StaffShift = {
  name: string;
  position: string;
  scheduledIn: string;
  scheduledOut: string;
  scheduledHours: number;
  actualHours?: number;
  rate: number;
  tasks?: string[];
};

export type FlagSeverity = "low" | "medium" | "high" | "critical";

export type Flag = {
  code: string;
  severity: FlagSeverity;
  message: string;
  evidenceRef: string[];
  autoResolution?: string;
  resolved: boolean;
};

export type EvidenceType = "extraction" | "validation" | "inference";

export type Evidence = {
  id: string;
  type: EvidenceType;
  source: string;
  data: unknown;
  confidence: number;
  timestamp: string;
};

export type EventStatus = "draft" | "validated" | "approved" | "completed";

export type ParsedEvent = {
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
};

export type ParsedEventResult = {
  event: ParsedEvent;
  warnings: string[];
  flags: Flag[];
  reviewItems: string[];
  confidence: number;
};

export type ParsedFile = {
  id: string;
  name: string;
  type: "pdf" | "csv";
  size: number;
  parsedAt: string;
  extractedData: unknown;
  confidence: number;
  errors: string[];
};

export type ReviewQueueItem = {
  id: string;
  eventId: string;
  type: "validation" | "ambiguity" | "conflict";
  issue: string;
  suggestedResolution?: string;
  requiresHuman: boolean;
  priority: number;
};
