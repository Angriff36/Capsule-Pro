export interface TaskTemplate {
  group: string;
  label: string;
  defaultTeam: string;
  defaultLocation: string;
  defaultStyle: string;
  notes: string;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  // PREP / SETUP
  { group: 'PREP / SETUP', label: 'Staff Huddle / Sign-In', defaultTeam: 'Everyone', defaultLocation: 'Truck', defaultStyle: 'NA', notes: 'Review roles, badges, sign book.' },
  { group: 'PREP / SETUP', label: 'Unload & Stage (ER)', defaultTeam: 'Everyone', defaultLocation: 'Scullery', defaultStyle: 'NA', notes: 'Unload vehicles; stage ER by area; set bleach & handwash.' },
  { group: 'PREP / SETUP', label: 'Build Field Kitchen', defaultTeam: 'BOH', defaultLocation: 'Field kitchen', defaultStyle: 'NA', notes: 'Tables, burners, staging per layout.' },
  { group: 'PREP / SETUP', label: 'Set up Scullery', defaultTeam: 'FOH', defaultLocation: 'Scullery', defaultStyle: 'NA', notes: 'Trash, sanitization, dish return; bussing flow ready.' },
  { group: 'PREP / SETUP', label: 'Set Buffet Tables & Decor', defaultTeam: 'FOH', defaultLocation: 'Buffet', defaultStyle: 'NA', notes: 'Decor, chafers, water pans; bleach bucket under table.' },
  { group: 'PREP / SETUP', label: 'Set Apps Table / Grazing Station', defaultTeam: 'FOH', defaultLocation: 'Apps', defaultStyle: 'NA', notes: 'Decor & serveware; keep tidy.' },
  { group: 'PREP / SETUP', label: 'Set Dessert Station', defaultTeam: 'FOH', defaultLocation: 'Dessert', defaultStyle: 'Dessert', notes: "S'mores/cake space; sternos if needed." },
  { group: 'PREP / SETUP', label: 'Stage Place Settings', defaultTeam: 'FOH', defaultLocation: 'Dining', defaultStyle: 'NA', notes: 'Unwrap & stage stacks by table.' },
  { group: 'PREP / SETUP', label: 'Set Place Settings', defaultTeam: 'FOH', defaultLocation: 'Dining', defaultStyle: 'NA', notes: 'Napkin fold, utensils, goblets; follow book.' },
  { group: 'PREP / SETUP', label: 'Prepare Trays & Jacks', defaultTeam: 'FOH', defaultLocation: 'Staging', defaultStyle: 'NA', notes: 'Clean/sanitize trays; drape linens.' },
  { group: 'PREP / SETUP', label: 'Bar Arrival & Setup', defaultTeam: 'Bar', defaultLocation: 'Bar', defaultStyle: 'Bar', notes: 'Ice, tools, glassware; Fill-n-Chill if used.' },
  // SERVICE
  { group: 'SERVICE', label: 'Apps Huddle', defaultTeam: 'FOH/BOH', defaultLocation: 'Field kitchen', defaultStyle: 'NA', notes: 'Review apps & dietary notes.' },
  { group: 'SERVICE', label: 'Passed Apps Service', defaultTeam: 'FOH', defaultLocation: 'Everywhere', defaultStyle: 'Passed', notes: '2 laps pass, 1 lap buss; repeat.' },
  { group: 'SERVICE', label: 'Stationary Apps Monitor/Refill', defaultTeam: 'FOH', defaultLocation: 'Apps', defaultStyle: 'NA', notes: 'Keep refreshed/clean; run to kitchen.' },
  { group: 'SERVICE', label: 'Light Sternos & Fill Chafers', defaultTeam: 'FOH', defaultLocation: 'Buffet', defaultStyle: 'Buffet', notes: 'Light sternos; water in chafers; sani bucket.' },
  { group: 'SERVICE', label: 'Stock Buffet / Set Food', defaultTeam: 'FOH/BOH', defaultLocation: 'Buffet', defaultStyle: 'Buffet', notes: 'Land food; check water; refill.' },
  { group: 'SERVICE', label: 'Buffet Service (Serve/Carve)', defaultTeam: 'FOH/BOH', defaultLocation: 'Buffet', defaultStyle: 'Buffet', notes: 'FOH serve; BOH run food.' },
  { group: 'SERVICE', label: 'Water Table Service', defaultTeam: 'FOH', defaultLocation: 'Dining', defaultStyle: 'NA', notes: 'Fill goblets between runs as specified.' },
  { group: 'SERVICE', label: 'Serve VIPs', defaultTeam: 'FOH', defaultLocation: 'Dining', defaultStyle: 'NA', notes: 'Plate & serve VIPs first.' },
  // FLIP / DESSERT
  { group: 'FLIP / DESSERT', label: 'Flip Buffet for Dessert', defaultTeam: 'FOH', defaultLocation: 'Buffet', defaultStyle: 'Dessert', notes: 'Close buffet; reset/stock dessert.' },
  { group: 'FLIP / DESSERT', label: 'Dessert Service', defaultTeam: 'FOH', defaultLocation: 'Buffet/Dessert', defaultStyle: 'Dessert', notes: 'Serve dessert; monitor station.' },
  // BREAKDOWN / CLOSEOUT
  { group: 'BREAKDOWN / CLOSEOUT', label: 'Break Down Buffet', defaultTeam: 'FOH', defaultLocation: 'Buffet', defaultStyle: 'NA', notes: 'Clean/dry chafers; box decor; return to truck.' },
  { group: 'BREAKDOWN / CLOSEOUT', label: 'Decor Packing', defaultTeam: 'FOH', defaultLocation: 'Buffet/Dessert', defaultStyle: 'NA', notes: 'Pack per checklist; protect fragile items.' },
  { group: 'BREAKDOWN / CLOSEOUT', label: 'Final Bussing & Walkthrough', defaultTeam: 'FOH', defaultLocation: 'Everywhere', defaultStyle: 'NA', notes: 'Return ER; trash; final check & sign-off.' },
  { group: 'BREAKDOWN / CLOSEOUT', label: 'Strike & Load Out', defaultTeam: 'FOH', defaultLocation: 'Buffet/Truck', defaultStyle: 'NA', notes: 'Strike tables; load DS; wipe down.' },
  // BAR
  { group: 'BAR', label: 'Bar Closing', defaultTeam: 'Bar', defaultLocation: 'Bar', defaultStyle: 'Bar', notes: 'Last call; break down; reload mixers; assist glassware bussing.' },
  // VENUE / ADMIN
  { group: 'VENUE / ADMIN', label: 'Check-in with Cooks/Kitchen', defaultTeam: 'FOH', defaultLocation: 'Field kitchen', defaultStyle: 'NA', notes: 'Sync timing; confirm menu/changes.' },
  { group: 'VENUE / ADMIN', label: 'Venue Access / Send-Off / Lock-Up', defaultTeam: 'FOH Lead', defaultLocation: 'Venue', defaultStyle: 'NA', notes: 'Coordinate access, send-off, lock up; client cleanup boundaries.' },
];

export const TASK_TEMPLATE_GROUPS = [...new Set(TASK_TEMPLATES.map((t) => t.group))];
