/**
 * Battle Board Adapter
 * Converts parsed event data to battle board format
 */
/**
 * Build a battle board from parsed event data
 */
export function buildBattleBoardFromEvent(event, options = {}) {
  const warnings = [];
  const missingFields = [];
  let filledFields = 0;
  let totalFields = 0;
  // Build meta section
  totalFields += 4;
  const meta = {
    eventName: event.client || "",
    eventNumber: event.number || "",
    eventDate: event.date || "",
    staffRestrooms: options.staffRestroomsDefault || "TBD",
    staffParking: options.staffParkingDefault || "TBD",
    lastUpdatedISO: new Date().toISOString(),
  };
  if (meta.eventName) {
    filledFields++;
  } else {
    missingFields.push("eventName");
  }
  if (meta.eventNumber) {
    filledFields++;
  } else {
    missingFields.push("eventNumber");
  }
  if (meta.eventDate) {
    filledFields++;
  } else {
    missingFields.push("eventDate");
  }
  // Staff restrooms/parking are defaulted, so we count them as filled
  filledFields++;
  // Convert staff
  totalFields++;
  const staff = convertStaffToBattleBoard(event.staffing);
  if (staff.length > 0) {
    filledFields++;
  } else {
    missingFields.push("staff");
    warnings.push("No staff data found. Staff section will be empty.");
  }
  // Convert timeline
  totalFields++;
  const timeline = convertTimelineToBattleBoard(event.timeline || [], event);
  if (timeline.length > 0) {
    filledFields++;
  } else {
    missingFields.push("timeline");
    warnings.push(
      "No timeline data found. Timeline section will need manual entry."
    );
  }
  // Build layouts
  totalFields++;
  const layouts = options.defaultLayouts || buildDefaultLayouts(event);
  if (layouts.length > 0) {
    filledFields++;
  } else {
    missingFields.push("layouts");
  }
  // Calculate auto-fill score (0-100)
  const autoFillScore = Math.round((filledFields / totalFields) * 100);
  const battleBoard = {
    schema: "mangia-battle-board@1",
    version: "1.0.0",
    meta,
    staff,
    layouts,
    timeline,
    attachments: [],
  };
  // Optionally include task library
  if (options.includeTaskLibrary !== false) {
    battleBoard.taskLibrary = getDefaultTaskLibrary();
  }
  return {
    battleBoard,
    autoFillScore,
    warnings,
    missingFields,
  };
}
/**
 * Convert staff shifts to battle board staff format
 */
function convertStaffToBattleBoard(staffing) {
  if (!staffing || staffing.length === 0) {
    return [];
  }
  return staffing.map((shift) => ({
    name: shift.name,
    role: mapPositionToRole(shift.position),
    shiftStart: formatTo12Hour(shift.scheduledIn),
    shiftEnd: formatTo12Hour(shift.scheduledOut),
    station: inferStationFromPosition(shift.position),
  }));
}
/**
 * Convert event timeline to battle board timeline format
 */
function convertTimelineToBattleBoard(timeline, event) {
  const result = [];
  // Convert parsed timeline entries
  for (const entry of timeline) {
    result.push({
      time: entry.time || "",
      item: entry.label,
      team: inferTeamFromPhase(entry.phase),
      location: inferLocationFromEntry(entry),
      style: mapPhaseToStyle(entry.phase),
      notes: entry.description || "",
      hl: isHighlightEntry(entry),
    });
  }
  // If no timeline but we have event times, add basic service entries
  if (result.length === 0 && event.times) {
    result.push(
      {
        time: event.times.start,
        item: "Event Start",
        team: "All Staff",
        location: event.venue?.name || "TBD",
        style: "service",
        notes: "",
        hl: true,
      },
      {
        time: event.times.end,
        item: "Event End",
        team: "All Staff",
        location: event.venue?.name || "TBD",
        style: "breakdown",
        notes: "",
        hl: true,
      }
    );
  }
  // Sort by time
  result.sort((a, b) => {
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    return timeA - timeB;
  });
  return result;
}
/**
 * Build default layouts based on event data
 */
function buildDefaultLayouts(event) {
  const layouts = [];
  // Always include a main layout
  layouts.push({
    type: "Main Hall",
    instructions: event.notes?.join(". ") || "See event briefing for details.",
  });
  // Add kitchen layout if menu has kitchen-finished items
  const hasKitchenService = event.menuSections?.some(
    (item) =>
      item.serviceLocation === "finish_at_kitchen" ||
      item.serviceLocation === "action_station"
  );
  if (hasKitchenService) {
    layouts.push({
      type: "Kitchen",
      instructions: "Kitchen prep and plating area.",
    });
  }
  // Add bar layout if service style mentions bar
  const hasBar =
    event.serviceStyle?.toLowerCase().includes("bar") ||
    event.menuSections?.some(
      (item) =>
        item.category.toLowerCase().includes("beverage") ||
        item.category.toLowerCase().includes("bar")
    );
  if (hasBar) {
    layouts.push({
      type: "Bar",
      instructions: "Bar setup and service area.",
    });
  }
  return layouts;
}
/**
 * Get the default task library
 */
function getDefaultTaskLibrary() {
  // Import is hoisted, but we need to dynamically reference to avoid circular deps
  const { DEFAULT_TASK_LIBRARY } = require("../types/battleBoard");
  return DEFAULT_TASK_LIBRARY;
}
// --- Helper Functions ---
function mapPositionToRole(position) {
  const normalized = position.toLowerCase();
  if (normalized.includes("captain") || normalized.includes("lead")) {
    return "Captain";
  }
  if (normalized.includes("chef") || normalized.includes("cook")) {
    return "Kitchen";
  }
  if (normalized.includes("server")) {
    return "Server";
  }
  if (normalized.includes("bartender") || normalized.includes("bar")) {
    return "Bar";
  }
  if (normalized.includes("runner") || normalized.includes("busser")) {
    return "Runner";
  }
  if (normalized.includes("dishwasher") || normalized.includes("utility")) {
    return "Utility";
  }
  return position || "Staff";
}
function inferStationFromPosition(position) {
  const normalized = position.toLowerCase();
  if (normalized.includes("chef") || normalized.includes("cook")) {
    return "Kitchen";
  }
  if (normalized.includes("bartender") || normalized.includes("bar")) {
    return "Bar";
  }
  if (normalized.includes("server") || normalized.includes("captain")) {
    return "Floor";
  }
  if (normalized.includes("runner") || normalized.includes("busser")) {
    return "Flex";
  }
  return "Assigned";
}
function mapPhaseToStyle(phase) {
  switch (phase) {
    case "setup":
      return "setup";
    case "service":
      return "service";
    case "teardown":
      return "breakdown";
    default:
      return "other";
  }
}
function inferTeamFromPhase(phase) {
  switch (phase) {
    case "setup":
      return "Ops Team";
    case "service":
      return "FOH / Kitchen";
    case "teardown":
      return "All Staff";
    default:
      return "TBD";
  }
}
function inferLocationFromEntry(entry) {
  const label = entry.label.toLowerCase();
  if (label.includes("kitchen") || label.includes("cook")) {
    return "Kitchen";
  }
  if (label.includes("bar")) {
    return "Bar";
  }
  if (label.includes("buffet")) {
    return "Buffet";
  }
  if (label.includes("guest") || label.includes("service")) {
    return "Guest Area";
  }
  return "Main Hall";
}
function isHighlightEntry(entry) {
  const label = entry.label.toLowerCase();
  const highlights = [
    "guest arrival",
    "service start",
    "event start",
    "event end",
    "vip",
    "toast",
    "speeches",
    "first dance",
    "dinner",
  ];
  return highlights.some((h) => label.includes(h));
}
function formatTo12Hour(time24) {
  if (!time24) {
    return "";
  }
  // Handle already formatted times
  if (
    time24.toLowerCase().includes("am") ||
    time24.toLowerCase().includes("pm")
  ) {
    return time24;
  }
  const match = time24.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return time24;
  }
  let hours = Number.parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = hours >= 12 ? "PM" : "AM";
  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }
  return `${hours}:${minutes} ${meridiem}`;
}
function parseTimeToMinutes(timeStr) {
  if (!timeStr) {
    return 0;
  }
  // Handle 12-hour format
  const match12 = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match12) {
    let hours = Number.parseInt(match12[1], 10);
    const minutes = Number.parseInt(match12[2], 10);
    const meridiem = match12[3]?.toUpperCase();
    if (meridiem === "PM" && hours < 12) {
      hours += 12;
    } else if (meridiem === "AM" && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  }
  return 0;
}
/**
 * Merge staff data from CSV into an existing battle board
 */
export function mergeStaffIntoBattleBoard(battleBoard, staffing) {
  const convertedStaff = convertStaffToBattleBoard(staffing);
  // Merge by name, preferring new data
  const existingNames = new Set(
    battleBoard.staff.map((s) => s.name.toLowerCase())
  );
  const newStaff = convertedStaff.filter(
    (s) => !existingNames.has(s.name.toLowerCase())
  );
  return {
    ...battleBoard,
    staff: [...battleBoard.staff, ...newStaff],
    meta: {
      ...battleBoard.meta,
      lastUpdatedISO: new Date().toISOString(),
    },
  };
}
/**
 * Create an empty battle board template
 */
export function createEmptyBattleBoard(eventName, eventDate) {
  return {
    schema: "mangia-battle-board@1",
    version: "1.0.0",
    meta: {
      eventName: eventName || "",
      eventNumber: "",
      eventDate: eventDate || "",
      staffRestrooms: "TBD",
      staffParking: "TBD",
      lastUpdatedISO: new Date().toISOString(),
    },
    staff: [],
    layouts: [
      {
        type: "Main Hall",
        instructions: "",
      },
    ],
    timeline: [],
    attachments: [],
    taskLibrary: getDefaultTaskLibrary(),
  };
}
