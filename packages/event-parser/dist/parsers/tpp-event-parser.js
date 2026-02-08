/**
 * TPP Event Parser
 * Parses TPP (Total Party Planner) format PDFs to extract event data
 * Adapted from Battle-Boards shared/parsers/tppEventParser.ts
 */
// Main parser function
export function parseTppEvent(rawLines, options) {
  const cleanedLines = preprocessLines(rawLines);
  const sections = buildSections(cleanedLines);
  const sectionMap = new Map(sections.map((s) => [s.label, s.lines]));
  // Extract core event data
  const client = mergeLines(sectionMap.get("client") ?? []);
  const onLines = sectionMap.get("on") ?? [];
  const dateLine = onLines[0] ?? "";
  const locationLines = onLines.slice(1);
  const { venueName, venueAddress } = deriveVenue(locationLines);
  // Try multiple invoice number variations
  const invoiceNumber =
    (sectionMap.get("invoice #:") ?? [])[0] ??
    (sectionMap.get("invoice #") ?? [])[0] ??
    (sectionMap.get("invoice") ?? [])[0] ??
    "";
  const noteLines = sectionMap.get("notes") ?? [];
  const timeline = sectionMap.get("timeline / key moments") ?? [];
  const normalizedNotes = noteLines.map(normalizeWhitespace).filter(Boolean);
  const timelineEntries = buildTimelineEntries(timeline);
  const experienceLine = findExperienceLine(cleanedLines);
  const menuItems = extractMenuItems(cleanedLines);
  const headcount = deriveHeadcount(menuItems, cleanedLines);
  const serviceStyle = deriveServiceStyle(experienceLine, menuItems);
  const allergens = deriveAllergens(menuItems, normalizedNotes);
  const kits = deriveKits(menuItems, cleanedLines);
  const { startTime, endTime } = deriveTimes(timeline, timelineEntries);
  const eventNumber =
    invoiceNumber || buildFallbackNumber(client, dateLine, options.sourceName);
  const eventId = `evt-${slugify(eventNumber)}`;
  const event = {
    id: eventId,
    number: eventNumber,
    client: client || "",
    date: normalizeDate(dateLine),
    venue: {
      name: venueName || "",
      address: venueAddress,
    },
    times: {
      start: startTime,
      end: endTime,
    },
    headcount,
    serviceStyle,
    kits,
    menuSections: menuItems,
    allergens,
    notes: normalizedNotes,
    timeline: timelineEntries,
    rawTimeline: timeline,
    staffing: [],
    flags: [],
    evidence: [],
    status: "draft",
  };
  const diagnostics = evaluateMenuDiagnostics(event, menuItems, {
    headcount,
    sourceName: options.sourceName,
  });
  const warnings = collectWarnings(
    event,
    { invoiceNumber, venueAddress, startTime, endTime },
    diagnostics.warnings
  );
  // Calculate confidence score
  const confidence = calculateConfidence(event, warnings);
  return {
    event,
    warnings,
    flags: diagnostics.flags,
    reviewItems: diagnostics.reviewItems.map((item) => item.issue),
    confidence,
  };
}
// --- Preprocessing ---
function preprocessLines(lines) {
  return lines
    .map((line) => line.replace(/\uFFFD/g, "").trim())
    .filter(Boolean);
}
function buildSections(lines) {
  const sections = [];
  let current = null;
  for (const line of lines) {
    // Check for section header with value on same line
    const sameLineMatch = line.match(/^(.+?):\s*(.+)$/);
    if (sameLineMatch) {
      const label = normalizeLabel(sameLineMatch[1]);
      const value = sameLineMatch[2].trim();
      current = { label, lines: value ? [value] : [] };
      sections.push(current);
      continue;
    }
    // Check for section header on its own line
    if (/^(.+?):$/.test(line)) {
      const label = normalizeLabel(line.slice(0, -1));
      current = { label, lines: [] };
      sections.push(current);
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }
  return sections;
}
function normalizeLabel(label) {
  return label.toLowerCase().replace(/\s+/g, " ").trim();
}
function mergeLines(lines) {
  return lines.join(" ").replace(/\s+/g, " ").trim();
}
function normalizeWhitespace(value) {
  return value ? value.replace(/\s+/g, " ").trim() : "";
}
// --- Venue Extraction ---
function deriveVenue(lines) {
  const nameParts = [];
  const addressParts = [];
  for (const line of lines) {
    if (addressParts.length === 0 && !/[0-9]/.test(line)) {
      nameParts.push(line);
    } else {
      addressParts.push(line);
    }
  }
  if (nameParts.length === 0 && addressParts.length > 0) {
    nameParts.push(addressParts.shift() ?? "");
  }
  return {
    venueName: nameParts.join(" ").trim(),
    venueAddress: addressParts.join("\n"),
  };
}
// --- Menu Item Extraction ---
function findExperienceLine(lines) {
  const experience = lines.find((line) => /experience\s*:?$/i.test(line));
  return experience ? experience.replace(/\s*:?$/, "").trim() : "";
}
const INSTRUCTION_PREFIXES = [
  "MAKE",
  "PORTION",
  "ADD",
  "PULL",
  "MARINATE",
  "SLICE",
  "DICE",
  "GRILL",
  "COOK",
  "HEAT",
  "WRAP",
  "SEND",
  "KEEP",
  "PLACE",
  "PACK",
  "BUILD",
  "TOSS",
  "PROOF",
  "BAKE",
  "CUT",
  "REST",
  "WARM",
  "SET",
  "PREP",
  "LABEL",
  "STORE",
  "COMBINE",
  "ASSEMBLE",
  "GARNISH",
  "PLATE",
  "HOLD",
  "CHECK",
  "PICK",
  "DELIVER",
  "FINISH",
  "REMOVE",
  "CLEAN",
  "BLEND",
  "CHOP",
  "WHISK",
  "POACH",
  "BOIL",
  "SAUTE",
  "SIMMER",
];
const ACRONYM_KEEP = new Set([
  "BBQ",
  "GF",
  "DF",
  "V",
  "VG",
  "VEG",
  "DIY",
  "VIP",
  "AI",
  "BLT",
  "P",
  "GF/V",
  "GF/VG",
  "GF/DF",
  "MTO",
]);
function extractMenuItems(lines) {
  const headerIndex = lines.findIndex((line) => /^quantity\/unit$/i.test(line));
  if (headerIndex === -1) {
    return [];
  }
  const items = [];
  let index = headerIndex + 1;
  while (index < lines.length) {
    const currentLine = lines[index];
    if (!currentLine || isFooterLine(currentLine)) {
      index += 1;
      continue;
    }
    if (isColumnHeading(currentLine)) {
      index += 1;
      continue;
    }
    // Parse category
    const categoryParts = [currentLine];
    index += 1;
    while (
      index < lines.length &&
      isCategoryContinuation(lines[index], categoryParts)
    ) {
      categoryParts.push(lines[index]);
      index += 1;
    }
    const rawCategory = normalizeWhitespace(categoryParts.join(" "));
    if (!rawCategory) {
      continue;
    }
    const categoryMeta = deriveCategoryMetadata(rawCategory);
    // Parse name and callouts
    const nameLines = [];
    const calloutLines = [];
    while (index < lines.length) {
      const segment = lines[index];
      if (!segment) {
        index += 1;
        continue;
      }
      if (
        isColumnHeading(segment) ||
        /^P:\s*/i.test(segment) ||
        isFooterLine(segment) ||
        isLikelyCategoryStart(segment, rawCategory)
      ) {
        break;
      }
      if (shouldContinueName(segment, nameLines.length)) {
        nameLines.push(segment);
      } else {
        calloutLines.push(segment);
      }
      index += 1;
    }
    const rawName = normalizeWhitespace(nameLines.join(" "));
    const normalizedName = normalizeDishName(rawName || rawCategory);
    // Parse quantities
    const quantityLines = [];
    while (index < lines.length && /^P:\s*/i.test(lines[index])) {
      quantityLines.push(lines[index]);
      index += 1;
    }
    // Parse trailing content
    const trailingLines = [];
    while (index < lines.length) {
      const trailing = lines[index];
      if (!trailing) {
        index += 1;
        continue;
      }
      if (
        isColumnHeading(trailing) ||
        /^P:\s*/i.test(trailing) ||
        isFooterLine(trailing) ||
        isLikelyCategoryStart(trailing, rawCategory)
      ) {
        break;
      }
      trailingLines.push(trailing);
      index += 1;
    }
    const quantityInfo = parseQuantitySegments(quantityLines, trailingLines);
    const specials = [...calloutLines, ...quantityInfo.specials]
      .map(normalizeWhitespace)
      .filter(Boolean);
    const prepNotes = buildPreparationNotes(quantityInfo.prepInstructions);
    const allergenSource = [...specials];
    if (prepNotes) {
      allergenSource.push(prepNotes);
    }
    items.push({
      category: categoryMeta.label,
      categoryPath: categoryMeta.path,
      group: categoryMeta.group,
      serviceLocation: categoryMeta.serviceLocation,
      badges: categoryMeta.badges,
      sortOrder: categoryMeta.sortOrder,
      name: normalizedName,
      rawName,
      qty: quantityInfo.primaryQuantity,
      quantityDetails: quantityInfo.details,
      warnings: quantityInfo.warnings,
      allergens: detectAllergens(allergenSource),
      specials,
      preparationNotes: prepNotes,
    });
  }
  return items.filter((item) => item.name.length > 0);
}
function isColumnHeading(line) {
  const normalized = normalizeWhitespace(line).toLowerCase();
  return (
    normalized === "category" ||
    normalized === "item" ||
    normalized.startsWith("special, production") ||
    normalized.includes("production notes") ||
    normalized === "special" ||
    normalized === "quantity/unit" ||
    normalized === "quantity" ||
    normalized === "unit"
  );
}
function isFooterLine(line) {
  const normalized = normalizeWhitespace(line).toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.startsWith("printed date") ||
    normalized === "page" ||
    normalized === "of" ||
    normalized.startsWith("site") ||
    normalized.startsWith("client") ||
    normalized.startsWith("phone") ||
    normalized.startsWith("fax") ||
    normalized.startsWith("driver") ||
    normalized.startsWith("invoice #") ||
    normalized === "notes:" ||
    normalized.startsWith("pricing menus") ||
    normalized.startsWith("mangia catering menu experience")
  );
}
function isCategoryContinuation(candidate, parts) {
  if (!candidate) {
    return false;
  }
  const trimmed = normalizeWhitespace(candidate);
  if (!trimmed) {
    return false;
  }
  if (
    isColumnHeading(trimmed) ||
    /^P:\s*/i.test(trimmed) ||
    isFooterLine(trimmed)
  ) {
    return false;
  }
  if (looksLikeInstruction(trimmed)) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (parts.length === 1) {
    const first = normalizeWhitespace(parts[0]).toLowerCase();
    if (first.endsWith("-")) {
      return true;
    }
    if (first.split(/\s+/).length === 1 && trimmed.split(/\s+/).length === 1) {
      return true;
    }
  }
  return (
    trimmed.length <= 28 &&
    /^[a-z0-9&()/-\s]+$/i.test(trimmed) &&
    !lower.includes("serving")
  );
}
function isLikelyCategoryStart(line, currentCategory) {
  const trimmed = normalizeWhitespace(line);
  if (!trimmed) {
    return false;
  }
  if (isColumnHeading(trimmed) || isFooterLine(trimmed)) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (/^(site|client|notes|invoice|driver|phone|fax)[:]?$/i.test(trimmed)) {
    return true;
  }
  if (lower === currentCategory.toLowerCase()) {
    return true;
  }
  if (
    lower.includes("finish at event") ||
    lower.includes("finish at kitchen") ||
    lower.includes("drop off") ||
    lower.includes("action station") ||
    lower.includes("passed") ||
    lower.includes("dessert") ||
    lower.includes("beverage")
  ) {
    return true;
  }
  return false;
}
function shouldContinueName(line, nameLineCount) {
  const trimmed = normalizeWhitespace(line);
  if (!trimmed) {
    return false;
  }
  if (looksLikeInstruction(trimmed)) {
    return false;
  }
  if (/^P:\s*/i.test(trimmed)) {
    return false;
  }
  if (nameLineCount === 0) {
    return true;
  }
  if (/^[A-Z0-9&'()/-]+$/.test(trimmed) && trimmed.length <= 34) {
    return true;
  }
  if (!/[a-z]/.test(trimmed) && trimmed.length <= 34) {
    return true;
  }
  if (
    nameLineCount < 2 &&
    trimmed.length <= 40 &&
    /^[A-Za-z0-9 &'()/-]+$/.test(trimmed)
  ) {
    return true;
  }
  return false;
}
function looksLikeInstruction(line) {
  const upper = normalizeWhitespace(line).toUpperCase();
  if (!upper) {
    return false;
  }
  if (/^[0-9]/.test(upper)) {
    return true;
  }
  if (upper.startsWith("***")) {
    return true;
  }
  if (upper.includes(" RECIPE")) {
    return true;
  }
  return INSTRUCTION_PREFIXES.some((prefix) => upper.startsWith(`${prefix} `));
}
function normalizeDishName(name) {
  const cleaned = normalizeWhitespace(name);
  if (!cleaned) {
    return "";
  }
  if (/^[A-Z0-9 &'()/-]+$/.test(cleaned) && /[A-Z]/.test(cleaned)) {
    return toTitleCasePreservingAcronyms(cleaned);
  }
  return cleaned;
}
function toTitleCasePreservingAcronyms(value) {
  const segments = value
    .toLowerCase()
    .split(/(\s+|[-/])/)
    .map((segment) => {
      if (!segment) {
        return segment;
      }
      if (/^\s+$/.test(segment) || segment === "-" || segment === "/") {
        return segment;
      }
      const upper = segment.toUpperCase();
      if (ACRONYM_KEEP.has(upper) || upper.length <= 2) {
        return upper;
      }
      return upper.charAt(0) + upper.slice(1).toLowerCase();
    });
  return segments
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
}
// --- Quantity Parsing ---
function parseQuantitySegments(quantityLines, trailingLines) {
  const details = [];
  const specials = [];
  const prepInstructions = [];
  const warnings = [];
  for (const line of quantityLines) {
    const detail = parsePortionLine(line, warnings);
    if (detail) {
      details.push(detail);
    }
  }
  for (let idx = 0; idx < trailingLines.length; ) {
    const current = normalizeWhitespace(trailingLines[idx]);
    if (!current) {
      idx += 1;
      continue;
    }
    const numeric = current.match(/^-?\d+(?:\.\d+)?$/);
    if (numeric) {
      const unitLineRaw = trailingLines[idx + 1]
        ? normalizeWhitespace(trailingLines[idx + 1])
        : "";
      const noteLineRaw = trailingLines[idx + 2]
        ? normalizeWhitespace(trailingLines[idx + 2])
        : "";
      if (unitLineRaw && isLikelyUnit(unitLineRaw)) {
        const value = Number.parseFloat(current);
        if (!Number.isNaN(value)) {
          const detail = {
            value,
            unit: unitLineRaw,
            raw: `${current} ${unitLineRaw}`,
          };
          if (noteLineRaw && looksLikeInstruction(noteLineRaw)) {
            detail.label = noteLineRaw;
            prepInstructions.push(noteLineRaw);
            idx += 3;
          } else {
            specials.push(`${current} ${unitLineRaw}`);
            idx += 2;
          }
          details.push(detail);
          continue;
        }
      }
    }
    if (looksLikeInstruction(current)) {
      prepInstructions.push(current);
    } else {
      specials.push(current);
    }
    idx += 1;
  }
  const primaryQuantity = selectPrimaryQuantity(details);
  return { primaryQuantity, details, specials, prepInstructions, warnings };
}
function parsePortionLine(line, warnings) {
  const match = line.match(/^P:\s*([\d.,]+)\s*(.*)$/i);
  if (!match) {
    warnings.push(`Unrecognized quantity format: "${line}"`);
    return null;
  }
  const value = Number.parseFloat(match[1].replace(/,/g, ""));
  if (Number.isNaN(value)) {
    warnings.push(`Unable to parse quantity number from "${line}"`);
    return null;
  }
  const unit = normalizeWhitespace(match[2]) || "serving";
  return { value, unit, label: "Portion", raw: line };
}
function selectPrimaryQuantity(details) {
  if (details.length === 0) {
    return { value: 0, unit: "" };
  }
  const servingDetail = details.find((detail) => /serv/i.test(detail.unit));
  const base = servingDetail ?? details[0];
  return {
    value: Number.isFinite(base.value) ? base.value : 0,
    unit: base.unit || "serving",
  };
}
function isLikelyUnit(value) {
  if (!value) {
    return false;
  }
  if (value.length > 20) {
    return false;
  }
  if (/[0-9]/.test(value)) {
    return false;
  }
  return /^[a-z#\s/]+$/i.test(value);
}
function buildPreparationNotes(lines) {
  if (lines.length === 0) {
    return undefined;
  }
  const formatted = lines.map((line) => toSentenceCase(line)).filter(Boolean);
  if (formatted.length === 0) {
    return undefined;
  }
  return formatted.join(" ");
}
function toSentenceCase(value) {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) {
    return "";
  }
  const lower = trimmed.toLowerCase();
  return trimmed.charAt(0).toUpperCase() + lower.slice(1);
}
// --- Category Metadata ---
function deriveCategoryMetadata(category) {
  const normalized = normalizeWhitespace(category);
  if (!normalized) {
    return { label: "", path: [], badges: [], sortOrder: 999 };
  }
  const segments = normalized
    .split(/\s*-\s*/)
    .map((segment) => toTitleCasePreservingAcronyms(segment));
  const lower = normalized.toLowerCase();
  let serviceLocation = "other";
  if (lower.includes("finish at event")) {
    serviceLocation = "finish_at_event";
  } else if (lower.includes("finish at kitchen")) {
    serviceLocation = "finish_at_kitchen";
  } else if (lower.includes("action station")) {
    serviceLocation = "action_station";
  } else if (lower.includes("drop off")) {
    serviceLocation = "drop_off";
  }
  const group = segments[0]
    ? toTitleCasePreservingAcronyms(segments[0])
    : undefined;
  const badges = new Set();
  switch (serviceLocation) {
    case "finish_at_event":
      badges.add("Finish @ Event");
      break;
    case "finish_at_kitchen":
      badges.add("Finish @ Kitchen");
      break;
    case "action_station":
      badges.add("Action Station");
      break;
    case "drop_off":
      badges.add("Drop Off");
      break;
  }
  if (lower.includes("passed")) {
    badges.add("Passed");
  }
  if (lower.includes("chef") || lower.includes("station")) {
    badges.add("Chef Station");
  }
  const label =
    segments.length > 0
      ? segments.join(" - ")
      : toTitleCasePreservingAcronyms(normalized);
  const sortOrder = computeCategorySortOrder(serviceLocation, lower, label);
  return {
    label,
    path: segments,
    group,
    serviceLocation,
    badges: [...badges],
    sortOrder,
  };
}
function computeCategorySortOrder(serviceLocation, lowerCategory, label) {
  if (lowerCategory.includes("passed")) {
    return 10;
  }
  if (lowerCategory.includes("apps") || lowerCategory.includes("appetizer")) {
    return 20;
  }
  if (serviceLocation === "action_station") {
    return 30;
  }
  if (lowerCategory.includes("station")) {
    return 35;
  }
  if (serviceLocation === "finish_at_event") {
    return 40;
  }
  if (serviceLocation === "finish_at_kitchen") {
    return 50;
  }
  if (lowerCategory.includes("entree") || lowerCategory.includes("main")) {
    return 60;
  }
  if (lowerCategory.includes("side") || lowerCategory.includes("salad")) {
    return 70;
  }
  if (lowerCategory.includes("dessert") || lowerCategory.includes("sweet")) {
    return 80;
  }
  if (
    lowerCategory.includes("beverage") ||
    lowerCategory.includes("drink") ||
    lowerCategory.includes("bar")
  ) {
    return 90;
  }
  if (serviceLocation === "drop_off") {
    return 100;
  }
  return 200 + (label ? label.toLowerCase().charCodeAt(0) : 0);
}
// --- Derived Data ---
function deriveHeadcount(menuItems, allLines) {
  const candidates = [];
  for (const item of menuItems) {
    if (/serv/i.test(item.qty.unit) && item.qty.value) {
      candidates.push(item.qty.value);
    }
    if (item.quantityDetails) {
      for (const detail of item.quantityDetails) {
        if (/serv/i.test(detail.unit) && detail.value) {
          candidates.push(detail.value);
        }
      }
    }
  }
  for (const line of allLines) {
    const match = line.match(/^P:\s*([\d.,]+)/i);
    if (match) {
      const value = Number.parseFloat(match[1].replace(/,/g, ""));
      if (value > 0) {
        candidates.push(value);
      }
    }
  }
  const sorted = candidates.filter((v) => v > 0).sort((a, b) => b - a);
  return sorted[0] ? Math.round(sorted[0]) : 0;
}
function deriveServiceStyle(experience, menuItems) {
  if (experience) {
    return experience;
  }
  const categories = new Set(
    menuItems.map((item) => item.category.toLowerCase())
  );
  if ([...categories].some((c) => c.includes("drop off"))) {
    return "Drop Off";
  }
  if (
    [...categories].some((c) => c.includes("finish at event")) &&
    [...categories].some((c) => c.includes("finish at kitchen"))
  ) {
    return "Action Station + Custom";
  }
  if ([...categories].some((c) => c.includes("apps"))) {
    return "Plated Service";
  }
  return "Catering Service";
}
function deriveAllergens(menuItems, notes) {
  const allergenSet = new Set();
  const sources = [
    ...menuItems.flatMap((item) =>
      item.specials.concat(item.preparationNotes ? [item.preparationNotes] : [])
    ),
    ...notes,
  ];
  for (const text of sources) {
    for (const allergen of detectAllergens([text])) {
      allergenSet.add(allergen);
    }
  }
  return [...allergenSet].sort();
}
function deriveKits(menuItems, lines) {
  const kitSet = new Set();
  const candidates = [
    ...menuItems.map((item) => `${item.category} ${item.name}`),
    ...menuItems.flatMap((item) =>
      item.preparationNotes ? item.preparationNotes.split("\n") : []
    ),
    ...lines,
  ];
  for (const text of candidates) {
    const lower = text.toLowerCase();
    if (/(chafer|sternos?)/i.test(lower)) {
      kitSet.add("Chafers + Sterno");
    }
    if (/(plasticware|utensil|fork|spoon|knife)/i.test(lower)) {
      kitSet.add("Disposable Utensils");
    }
    if (/pizza/i.test(lower)) {
      kitSet.add("Pizza Equipment");
    }
    if (/taco/i.test(lower)) {
      kitSet.add("Taco Station Kit");
    }
    if (/action station/i.test(lower)) {
      kitSet.add("Action Station Kit");
    }
    if (/bread|roll/i.test(lower)) {
      kitSet.add("Bread Baskets");
    }
    if (/carv/i.test(lower)) {
      kitSet.add("Carving Knives");
    }
    if (/induction|burner/i.test(lower)) {
      kitSet.add("Induction Burners");
    }
    if (/water service/i.test(lower)) {
      kitSet.add("Table Service Kit");
    }
  }
  return [...kitSet].sort();
}
// --- Timeline Parsing ---
function buildTimelineEntries(lines) {
  const entries = [];
  for (const line of lines) {
    const entry = parseTimelineLine(line);
    if (entry) {
      entries.push(entry);
    }
  }
  return entries;
}
function parseTimelineLine(line) {
  const raw = normalizeWhitespace(line);
  if (!raw) {
    return null;
  }
  // Try range pattern first (e.g., "5:00 PM - 10:00 PM")
  const rangeRegex =
    /(\d{1,2}(?::\d{2})?)\s*(a\.m\.|p\.m\.|am|pm)?\s*(?:-|\u2013|\u2014|to|through|until)\s*(\d{1,2}(?::\d{2})?)\s*(a\.m\.|p\.m\.|am|pm)?/i;
  const rangeMatch = rangeRegex.exec(raw);
  if (rangeMatch) {
    const [matchText, startRaw, startMeridiem, endRaw, endMeridiem] =
      rangeMatch;
    const startMinutes = toMinutes(startRaw, startMeridiem);
    const endMinutes = toMinutes(endRaw, endMeridiem || startMeridiem);
    const beforeRaw = raw.slice(0, rangeMatch.index);
    const afterRaw = raw.slice(rangeMatch.index + matchText.length);
    const before = cleanupTimelineLabel(beforeRaw);
    const after = cleanupTimelineLabel(afterRaw);
    const label =
      [before, after].filter(Boolean).join(" ").trim() || "Timeline item";
    const phase = categorizeTimelinePhase(label || raw);
    return {
      label,
      description: after || before || undefined,
      time: formatMinutesLabel(startMinutes),
      endTime: formatMinutesLabel(endMinutes),
      minutes: startMinutes ?? undefined,
      endMinutes: endMinutes ?? undefined,
      phase,
      raw,
    };
  }
  // Try single time pattern
  const singleRegex = /(\d{1,2}(?::\d{2})?)\s*(a\.m\.|p\.m\.|am|pm)/i;
  const singleMatch = singleRegex.exec(raw);
  if (singleMatch) {
    const [matchText, timeRaw, meridiem] = singleMatch;
    const minutes = toMinutes(timeRaw, meridiem);
    const beforeRaw = raw.slice(0, singleMatch.index);
    const afterRaw = raw.slice(singleMatch.index + matchText.length);
    const before = cleanupTimelineLabel(beforeRaw);
    const after = cleanupTimelineLabel(afterRaw);
    const label =
      [before, after].filter(Boolean).join(" ").trim() || "Timeline item";
    const phase = categorizeTimelinePhase(label || raw);
    return {
      label,
      description: after || before || undefined,
      time: formatMinutesLabel(minutes),
      minutes: minutes ?? undefined,
      phase,
      raw,
    };
  }
  return { label: raw, phase: categorizeTimelinePhase(raw), raw };
}
function cleanupTimelineLabel(value) {
  return value
    .replace(/^[:\s\-\u2013\u2014]+/, "")
    .replace(/[:\s\-\u2013\u2014]+$/, "")
    .trim();
}
function formatMinutesLabel(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const minutesInDay = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(minutesInDay / 60);
  const minutes = minutesInDay % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}
function categorizeTimelinePhase(text) {
  const value = text.toLowerCase();
  if (!value) {
    return "other";
  }
  if (
    /(setup|set[-\s]?up|arrival|arrive|load\s?in|prep|staging|deliver|drop[-\s]?off|crew call|call time)/.test(
      value
    )
  ) {
    return "setup";
  }
  if (
    /(ceremony|service|serve|dinner|lunch|meal|buffet|reception|cocktail|program|toast|bar|course|plated|dessert|hour)/.test(
      value
    )
  ) {
    return "service";
  }
  if (
    /(teardown|tear[-\s]?down|load\s?out|strike|clean|cleanup|wrap|depart|end|breakdown|reset)/.test(
      value
    )
  ) {
    return "teardown";
  }
  return "other";
}
function deriveTimes(timelineLines, parsedEntries) {
  const minutes = [];
  if (parsedEntries && parsedEntries.length > 0) {
    for (const entry of parsedEntries) {
      if (typeof entry.minutes === "number" && !Number.isNaN(entry.minutes)) {
        minutes.push(entry.minutes);
      }
      if (
        typeof entry.endMinutes === "number" &&
        !Number.isNaN(entry.endMinutes)
      ) {
        minutes.push(entry.endMinutes);
      }
    }
  }
  if (minutes.length === 0) {
    for (const line of timelineLines) {
      const rangeMatch = line.match(
        /(\d{1,2}(?::\d{2})?)(?:\s*(a\.m\.|p\.m\.|am|pm)?)\s*(?:-|\u2013|\u2014)\s*(\d{1,2}(?::\d{2})?)\s*(a\.m\.|p\.m\.|am|pm)?/i
      );
      if (rangeMatch) {
        const [, start, startMeridiem, end, endMeridiem] = rangeMatch;
        const startMinutes = toMinutes(start, startMeridiem);
        const endMinutes = toMinutes(end, endMeridiem || startMeridiem);
        if (startMinutes !== null) {
          minutes.push(startMinutes);
        }
        if (endMinutes !== null) {
          minutes.push(endMinutes);
        }
        continue;
      }
      const singleMatch = line.match(
        /(\d{1,2}(?::\d{2})?)\s*(a\.m\.|p\.m\.|am|pm)/i
      );
      if (singleMatch) {
        const [, time, meridiem] = singleMatch;
        const value = toMinutes(time, meridiem);
        if (value !== null) {
          minutes.push(value);
        }
      }
    }
  }
  const sorted = [...new Set(minutes)].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { startTime: "", endTime: "" };
  }
  const format = (mins) => {
    const hours = Math.floor(mins / 60);
    const minutesPart = mins % 60;
    return `${hours.toString().padStart(2, "0")}:${minutesPart.toString().padStart(2, "0")}`;
  };
  const startTime = format(sorted[0]);
  const endTime = sorted.length > 1 ? format(sorted.at(-1) ?? 0) : "";
  return { startTime, endTime };
}
function toMinutes(time, meridiem) {
  const normalized = normalizeWhitespace(time);
  if (!normalized) {
    return null;
  }
  let hours;
  let mins;
  if (normalized.includes(":")) {
    const [hoursStr, minutesStr] = normalized.split(":");
    hours = Number.parseInt(hoursStr, 10);
    mins = Number.parseInt(minutesStr, 10);
  } else if (/^\d{3,4}$/.test(normalized)) {
    hours = Number.parseInt(normalized.slice(0, -2), 10);
    mins = Number.parseInt(normalized.slice(-2), 10);
  } else {
    hours = Number.parseInt(normalized, 10);
    mins = 0;
  }
  if (Number.isNaN(hours) || Number.isNaN(mins)) {
    return null;
  }
  mins = Math.max(0, Math.min(mins, 59));
  let adjustedHours;
  if (meridiem) {
    adjustedHours = hours % 12;
    const lower = meridiem.toLowerCase();
    if (lower.includes("p") && adjustedHours < 12) {
      adjustedHours += 12;
    }
    if (lower.includes("a") && adjustedHours === 12) {
      adjustedHours = 0;
    }
  } else if (hours === 0) {
    adjustedHours = 0;
  } else if (hours >= 1 && hours <= 3) {
    adjustedHours = hours + 12;
  } else if (hours >= 4 && hours < 24) {
    adjustedHours = hours;
  } else {
    adjustedHours = hours % 24;
  }
  return adjustedHours * 60 + mins;
}
// --- Utilities ---
function normalizeDate(input) {
  if (!input) {
    return "";
  }
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  const fallbackMatch = input.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (fallbackMatch) {
    const [, month, day, year] = fallbackMatch;
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    return `${normalizedYear.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return "";
}
function buildFallbackNumber(client, dateLine, sourceName) {
  const base = [client, dateLine || sourceName]
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean)
    .join("-");
  return base || `FILE-${sourceName}`;
}
function slugify(value) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug) {
    return slug;
  }
  return Math.random().toString(36).slice(2, 10);
}
// --- Diagnostics & Validation ---
function evaluateMenuDiagnostics(event, items, context) {
  const flags = [];
  const reviewItems = [];
  const warnings = [];
  let issueCounter = 0;
  for (const item of items) {
    if (item.warnings && item.warnings.length > 0) {
      item.warnings.forEach((warning) => {
        warnings.push(`${item.name}: ${warning}`);
      });
    }
  }
  // Check for missing quantities
  const missingQuantityItems = items.filter((item) => item.qty.value === 0);
  for (const item of missingQuantityItems) {
    issueCounter += 1;
    const flagCode = `MENU_QTY_MISSING_${issueCounter}`;
    flags.push({
      code: flagCode,
      severity: "medium",
      message: `Menu item "${item.name}" is missing a portion quantity (source: ${context.sourceName})`,
      evidenceRef: ["parser_quantity_scan"],
      resolved: false,
      autoResolution: "Confirm portion count in source document",
    });
    reviewItems.push({
      id: `${event.id}-qty-${issueCounter}`,
      eventId: event.id,
      type: "validation",
      issue: `Quantity missing for "${item.name}"`,
      suggestedResolution: "Confirm portion count and update the menu item.",
      requiresHuman: true,
      priority: 2,
    });
  }
  // Check for headcount
  if (context.headcount <= 0 && items.length > 0) {
    issueCounter += 1;
    flags.push({
      code: "HEADCOUNT_MISSING",
      severity: "high",
      message: `Headcount was not detected but ${items.length} menu items were parsed.`,
      evidenceRef: ["parser_headcount_scan"],
      resolved: false,
      autoResolution: "Verify guest count within the source PDF.",
    });
    reviewItems.push({
      id: `${event.id}-headcount-${issueCounter}`,
      eventId: event.id,
      type: "validation",
      issue: "Headcount missing while menu items are present",
      suggestedResolution: "Confirm guest count and update the event.",
      requiresHuman: true,
      priority: 1,
    });
  }
  return { flags, reviewItems, warnings };
}
function collectWarnings(event, context, extraWarnings = []) {
  const warnings = [];
  if (!context.invoiceNumber) {
    warnings.push("Missing invoice number");
  }
  if (!event.client) {
    warnings.push("Missing client name");
  }
  if (!event.date) {
    warnings.push("Missing event date");
  }
  if (!event.venue.name) {
    warnings.push("Missing venue name");
  }
  if (!context.venueAddress) {
    warnings.push("Venue address could not be extracted");
  }
  if (!(context.startTime && context.endTime)) {
    warnings.push("Event time window is incomplete");
  }
  if (event.menuSections.length === 0) {
    warnings.push("No menu items were detected");
  }
  return [...warnings, ...extraWarnings];
}
function calculateConfidence(event, warnings) {
  let score = 100;
  // Deduct for missing key data
  if (!event.client) {
    score -= 15;
  }
  if (!event.date) {
    score -= 15;
  }
  if (!event.venue.name) {
    score -= 10;
  }
  if (!event.venue.address) {
    score -= 5;
  }
  if (!event.times.start) {
    score -= 5;
  }
  if (!event.times.end) {
    score -= 5;
  }
  if (event.headcount === 0) {
    score -= 10;
  }
  if (event.menuSections.length === 0) {
    score -= 20;
  }
  // Deduct for warnings
  score -= Math.min(warnings.length * 3, 15);
  return Math.max(0, score);
}
// --- Allergen Detection ---
function detectAllergens(texts) {
  const allergenRules = {
    gluten: [/gluten/i, /\bgf\b/i, /crostini/i, /bread/i, /roll/i],
    dairy: [/dairy/i, /cheese/i, /butter/i, /cream/i, /ricotta/i, /whipped/i],
    nut: [/nut/i, /pecan/i, /almond/i, /walnut/i],
    shellfish: [/shrimp/i, /lobster/i, /crab/i, /shellfish/i],
    egg: [/egg/i, /aioli/i],
    soy: [/soy/i, /tofu/i, /edamame/i],
    vegetarian: [/vegetarian/i, /veg\b/i, /plant-forward/i],
    vegan: [/vegan/i, /plant-based/i],
  };
  const detected = new Set();
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const [allergen, patterns] of Object.entries(allergenRules)) {
      if (patterns.some((pattern) => pattern.test(lower))) {
        detected.add(allergen);
      }
    }
  }
  return [...detected];
}
