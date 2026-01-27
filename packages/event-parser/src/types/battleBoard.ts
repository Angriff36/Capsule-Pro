// Battle Board data structure types
// Based on Event-Battle-Board JSON schema "mangia-battle-board@1"

export interface BattleBoardMeta {
  eventName: string;
  eventNumber: string;
  eventDate: string;
  staffRestrooms: string;
  staffParking: string;
  lastUpdatedISO?: string;
}

export interface BattleBoardStaff {
  name: string;
  role: string;
  shiftStart: string; // 12-hour format: "3:30 PM"
  shiftEnd: string; // 12-hour format: "11:59 PM"
  station: string;
}

export interface BattleBoardLayout {
  type: string;
  instructions: string;
  linkedMapImage?: string;
}

export type TimelineStyle = 'setup' | 'service' | 'breakdown' | 'other';

export interface BattleBoardTimeline {
  time: string;
  item: string;
  team: string;
  location: string;
  style: TimelineStyle | string;
  notes: string;
  hl: boolean; // highlight
}

export interface BattleBoardAttachment {
  label: string;
  name: string;
  type: string;
  size: number;
  src: string;
}

export interface BattleBoardTask {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultTeam: string;
  defaultLocation: string;
  defaultStyle: TimelineStyle;
}

export interface BattleBoardData {
  schema?: string;
  version?: string;
  meta: BattleBoardMeta;
  staff: BattleBoardStaff[];
  layouts: BattleBoardLayout[];
  timeline: BattleBoardTimeline[];
  attachments: BattleBoardAttachment[];
  taskLibrary?: BattleBoardTask[];
}

// Partial update interface for format-specific adapters
export type PartialBattleBoardData = Partial<BattleBoardData> & {
  meta?: Partial<BattleBoardMeta>;
};

// Default task library (28 predefined tasks)
export const DEFAULT_TASK_LIBRARY: BattleBoardTask[] = [
  // PREP/SETUP
  {
    id: 'staff-huddle',
    name: 'Staff Huddle',
    description: 'Brief team on event details, assignments, and timeline',
    category: 'prep',
    defaultTeam: 'All Staff',
    defaultLocation: 'Main Hall',
    defaultStyle: 'setup',
  },
  {
    id: 'unload-vehicles',
    name: 'Unload Vehicles',
    description: 'Unload equipment and supplies from vehicles',
    category: 'prep',
    defaultTeam: 'Ops Team',
    defaultLocation: 'Loading Dock',
    defaultStyle: 'setup',
  },
  {
    id: 'build-kitchen',
    name: 'Build Kitchen',
    description: 'Set up field kitchen stations and equipment',
    category: 'prep',
    defaultTeam: 'Kitchen',
    defaultLocation: 'Kitchen Area',
    defaultStyle: 'setup',
  },
  {
    id: 'set-scullery',
    name: 'Set Scullery',
    description: 'Set up dish washing and sanitization area',
    category: 'prep',
    defaultTeam: 'Kitchen',
    defaultLocation: 'Scullery',
    defaultStyle: 'setup',
  },
  {
    id: 'buffet-tables',
    name: 'Set Buffet Tables',
    description: 'Arrange and dress buffet stations',
    category: 'prep',
    defaultTeam: 'FOH',
    defaultLocation: 'Buffet',
    defaultStyle: 'setup',
  },
  {
    id: 'apps-station',
    name: 'Apps Station Setup',
    description: 'Set up passed appetizers staging area',
    category: 'prep',
    defaultTeam: 'FOH',
    defaultLocation: 'Apps Station',
    defaultStyle: 'setup',
  },
  {
    id: 'dessert-setup',
    name: 'Dessert Station Setup',
    description: 'Prepare dessert display and service area',
    category: 'prep',
    defaultTeam: 'FOH',
    defaultLocation: 'Dessert',
    defaultStyle: 'setup',
  },
  {
    id: 'place-settings',
    name: 'Place Settings',
    description: 'Set tables with linens, plates, cutlery, glassware',
    category: 'prep',
    defaultTeam: 'FOH',
    defaultLocation: 'Dining Area',
    defaultStyle: 'setup',
  },
  {
    id: 'trays-staging',
    name: 'Stage Trays',
    description: 'Prepare and stage service trays',
    category: 'prep',
    defaultTeam: 'FOH',
    defaultLocation: 'Service Area',
    defaultStyle: 'setup',
  },
  {
    id: 'bar-setup',
    name: 'Bar Setup',
    description: 'Set up bar station with glassware, ice, garnishes',
    category: 'prep',
    defaultTeam: 'Bar',
    defaultLocation: 'Bar',
    defaultStyle: 'setup',
  },
  {
    id: 'av-check',
    name: 'AV Sound Check',
    description: 'Test audio/visual equipment',
    category: 'prep',
    defaultTeam: 'AV / Tech',
    defaultLocation: 'Main Stage',
    defaultStyle: 'setup',
  },
  // SERVICE
  {
    id: 'apps-huddle',
    name: 'Apps Service Huddle',
    description: 'Brief servers on appetizer service',
    category: 'service',
    defaultTeam: 'FOH',
    defaultLocation: 'Service Area',
    defaultStyle: 'service',
  },
  {
    id: 'passed-apps',
    name: 'Passed Apps Service',
    description: 'Begin passing appetizers to guests',
    category: 'service',
    defaultTeam: 'Servers',
    defaultLocation: 'Guest Area',
    defaultStyle: 'service',
  },
  {
    id: 'stationary-apps',
    name: 'Stationary Apps',
    description: 'Monitor and refresh stationary appetizer displays',
    category: 'service',
    defaultTeam: 'FOH',
    defaultLocation: 'Apps Station',
    defaultStyle: 'service',
  },
  {
    id: 'light-sternos',
    name: 'Light Sternos',
    description: 'Light chafing dish sternos before service',
    category: 'service',
    defaultTeam: 'Kitchen',
    defaultLocation: 'Buffet',
    defaultStyle: 'service',
  },
  {
    id: 'stock-buffet',
    name: 'Stock Buffet',
    description: 'Initial buffet stocking with all items',
    category: 'service',
    defaultTeam: 'Kitchen / FOH',
    defaultLocation: 'Buffet',
    defaultStyle: 'service',
  },
  {
    id: 'buffet-service',
    name: 'Buffet Service',
    description: 'Monitor and replenish buffet during service',
    category: 'service',
    defaultTeam: 'Kitchen / FOH',
    defaultLocation: 'Buffet',
    defaultStyle: 'service',
  },
  {
    id: 'water-service',
    name: 'Water Service',
    description: 'Pour water and maintain beverage service',
    category: 'service',
    defaultTeam: 'Servers',
    defaultLocation: 'Dining Area',
    defaultStyle: 'service',
  },
  {
    id: 'vip-service',
    name: 'VIP Service',
    description: 'Dedicated service for VIP tables',
    category: 'service',
    defaultTeam: 'Lead Server',
    defaultLocation: 'VIP Area',
    defaultStyle: 'service',
  },
  // FLIP/DESSERT
  {
    id: 'flip-buffet',
    name: 'Flip Buffet',
    description: 'Clear entree items, transition to dessert',
    category: 'flip',
    defaultTeam: 'Kitchen / FOH',
    defaultLocation: 'Buffet',
    defaultStyle: 'service',
  },
  {
    id: 'dessert-service',
    name: 'Dessert Service',
    description: 'Begin dessert and coffee service',
    category: 'flip',
    defaultTeam: 'FOH',
    defaultLocation: 'Dessert / Dining',
    defaultStyle: 'service',
  },
  // BREAKDOWN
  {
    id: 'break-buffet',
    name: 'Break Down Buffet',
    description: 'Clear and clean buffet stations, pack equipment',
    category: 'breakdown',
    defaultTeam: 'FOH',
    defaultLocation: 'Buffet',
    defaultStyle: 'breakdown',
  },
  {
    id: 'decor-packing',
    name: 'Decor Packing',
    description: 'Pack decor items per checklist, protect fragile items',
    category: 'breakdown',
    defaultTeam: 'FOH',
    defaultLocation: 'Various',
    defaultStyle: 'breakdown',
  },
  {
    id: 'final-bussing',
    name: 'Final Bussing',
    description: 'Clear all remaining items from dining area',
    category: 'breakdown',
    defaultTeam: 'All Staff',
    defaultLocation: 'Dining Area',
    defaultStyle: 'breakdown',
  },
  {
    id: 'strike-load',
    name: 'Strike & Load',
    description: 'Final equipment strike, load vehicles',
    category: 'breakdown',
    defaultTeam: 'All Staff',
    defaultLocation: 'Entire Venue',
    defaultStyle: 'breakdown',
  },
  // BAR
  {
    id: 'bar-closing',
    name: 'Bar Closing',
    description: 'Last call, break down bar, pack glassware',
    category: 'bar',
    defaultTeam: 'Bar',
    defaultLocation: 'Bar',
    defaultStyle: 'breakdown',
  },
  // VENUE/ADMIN
  {
    id: 'cook-checkin',
    name: 'Check-in with Cooks',
    description: 'Verify kitchen team arrival, prep status',
    category: 'admin',
    defaultTeam: 'Lead',
    defaultLocation: 'Kitchen',
    defaultStyle: 'setup',
  },
  {
    id: 'venue-lockup',
    name: 'Venue Access / Lock-up',
    description: 'Coordinate venue access and final lock-up',
    category: 'admin',
    defaultTeam: 'Lead',
    defaultLocation: 'Venue Entry',
    defaultStyle: 'breakdown',
  },
];
