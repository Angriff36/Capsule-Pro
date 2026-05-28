export interface BattleBoard {
  id: string;
  tenant_id: string;
  event_name: string;
  event_number: string;
  event_date: string | null;
  venue_name: string;
  venue_address: string;
  headcount: number;
  service_style: string;
  staff_parking: string;
  staff_restrooms: string;
  notes: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BattleBoardStaff {
  id: string;
  board_id: string;
  tenant_id: string;
  name: string;
  role: string;
  shift_start: string;
  shift_end: string;
  station: string;
  sort_order: number;
}

export interface BattleBoardTimeline {
  id: string;
  board_id: string;
  tenant_id: string;
  time: string;
  item: string;
  team: string;
  location: string;
  style: string;
  notes: string;
  highlighted: boolean;
  sort_order: number;
}

export interface BattleBoardLayout {
  id: string;
  board_id: string;
  tenant_id: string;
  type: string;
  instructions: string;
  sort_order: number;
}

export interface BattleBoardImport {
  id: string;
  board_id: string;
  tenant_id: string;
  file_name: string;
  file_type: string;
  format_detected: string;
  confidence: string;
  warnings: string[];
  imported_at: string;
}

export interface BattleBoardFull extends BattleBoard {
  staff: BattleBoardStaff[];
  timeline: BattleBoardTimeline[];
  layouts: BattleBoardLayout[];
  imports: BattleBoardImport[];
}

export interface ParsedDocumentResult {
  success: boolean;
  format: 'tpp' | 'csv' | 'generic';
  confidence: 'high' | 'medium' | 'low';
  data: {
    meta: Partial<Pick<BattleBoard,
      'event_name' | 'event_number' | 'event_date' | 'venue_name' |
      'venue_address' | 'headcount' | 'service_style' | 'staff_parking' | 'staff_restrooms'
    >>;
    staff: Omit<BattleBoardStaff, 'id' | 'board_id' | 'tenant_id'>[];
    timeline: Omit<BattleBoardTimeline, 'id' | 'board_id' | 'tenant_id'>[];
    layouts: Omit<BattleBoardLayout, 'id' | 'board_id' | 'tenant_id'>[];
  };
  warnings: string[];
  error?: string;
}
