export interface BattleBoard {
  created_at: string;
  deleted_at: string | null;
  event_date: string | null;
  event_name: string;
  event_number: string;
  headcount: number;
  id: string;
  notes: string;
  service_style: string;
  staff_parking: string;
  staff_restrooms: string;
  status: "draft" | "active" | "completed" | "archived";
  tenant_id: string;
  updated_at: string;
  venue_address: string;
  venue_name: string;
}

export interface BattleBoardStaff {
  board_id: string;
  id: string;
  name: string;
  role: string;
  shift_end: string;
  shift_start: string;
  sort_order: number;
  station: string;
  tenant_id: string;
}

export interface BattleBoardTimeline {
  board_id: string;
  highlighted: boolean;
  id: string;
  item: string;
  location: string;
  notes: string;
  sort_order: number;
  style: string;
  team: string;
  tenant_id: string;
  time: string;
}

export interface BattleBoardLayout {
  board_id: string;
  id: string;
  instructions: string;
  sort_order: number;
  tenant_id: string;
  type: string;
}

export interface BattleBoardImport {
  board_id: string;
  confidence: string;
  file_name: string;
  file_type: string;
  format_detected: string;
  id: string;
  imported_at: string;
  tenant_id: string;
  warnings: string[];
}

export interface BattleBoardFull extends BattleBoard {
  imports: BattleBoardImport[];
  layouts: BattleBoardLayout[];
  staff: BattleBoardStaff[];
  timeline: BattleBoardTimeline[];
}

export interface ParsedDocumentResult {
  confidence: "high" | "medium" | "low";
  data: {
    meta: Partial<
      Pick<
        BattleBoard,
        | "event_name"
        | "event_number"
        | "event_date"
        | "venue_name"
        | "venue_address"
        | "headcount"
        | "service_style"
        | "staff_parking"
        | "staff_restrooms"
      >
    >;
    staff: Omit<BattleBoardStaff, "id" | "board_id" | "tenant_id">[];
    timeline: Omit<BattleBoardTimeline, "id" | "board_id" | "tenant_id">[];
    layouts: Omit<BattleBoardLayout, "id" | "board_id" | "tenant_id">[];
  };
  error?: string;
  format: "tpp" | "csv" | "generic";
  success: boolean;
  warnings: string[];
}
