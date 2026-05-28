// apps/app/lib/battle-boards/parsers/tpp-parser.ts
// Ported from C:/Projects/Battle-Boards/shared/parsers/tppEventParser.ts
// External type imports inlined; culinaryChecklist stubbed.
import type { ParsedDocumentResult } from '../types';

// ── Inlined minimal types (from Battle-Boards types/event.ts) ────────────────
interface MenuQuantityDetail { value: number; unit: string; label?: string; raw?: string; }
interface MenuItem {
  id?: string;
  category: string;
  categoryPath?: string[];
  group?: string;
  serviceLocation?: 'finish_at_event' | 'finish_at_kitchen' | 'action_station' | 'drop_off' | 'other';
  badges?: string[];
  sortOrder?: number;
  name: string;
  rawName?: string;
  qty: MenuQuantityDetail;
  quantityDetails?: MenuQuantityDetail[];
  warnings?: string[];
  allergens?: string[];
  specials?: string[];
  preparationNotes?: string;
}
interface EventTimelineEntry {
  time?: string;
  endTime?: string;
  minutes?: number;
  endMinutes?: number;
  label: string;
  description?: string;
  phase?: string;
  raw?: string;
}
type TimelinePhase = string;
interface StaffShift { name: string; position?: string; scheduledIn?: string; scheduledOut?: string; }
interface EventVenue { name: string; address: string; }
interface EventTimes { start: string; end: string; }
interface Event {
  id: string;
  number: string;
  client: string;
  date: string;
  venue: EventVenue;
  times: EventTimes;
  headcount: number;
  serviceStyle: string;
  menuSections: MenuItem[];
  allergens: string[];
  staffing?: StaffShift[];
  timeline?: EventTimelineEntry[];
  rawTimeline?: string[];
  kits?: string[];
  notes?: string[];
  flags?: Flag[];
  evidence?: unknown[];
  status?: string;
  checklist?: unknown[];
}
interface Flag {
  id?: string;
  code?: string;
  eventId?: string;
  type?: string;
  message: string;
  severity: number | string;
  evidenceRef?: string[];
  resolved?: boolean;
  autoResolution?: string;
}
interface ReviewQueueItem {
  id: string;
  eventId: string;
  type: string;
  issue: string;
  suggestedResolution: string;
  requiresHuman: boolean;
  priority: number;
}

// Stub — not needed for BattleBoard output
function buildInitialChecklist(_event?: unknown): unknown[] { return []; }

// ── Ported body of tppEventParser.ts ─────────────────────────────────────────

export interface ParsedEventResult {
  event: Event;
  warnings: string[];
  timeline: string[];
  notes?: string[];
  normalizedNotes?: string[];
  flags: Flag[];
  reviewItems: ReviewQueueItem[];
}

export interface ParseOptions {
  sourceName: string;
}

export function parseTppEvent(rawLines: string[], options: ParseOptions): ParsedEventResult {
  const cleanedLines = preprocessLines(rawLines);
  const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;
  if (typeof window !== 'undefined' && isDev) {
    console.groupCollapsed(`TTP parse: ${options.sourceName}`);
    console.log('raw lines sample', rawLines.slice(0, 40));
    console.log('cleaned lines sample', cleanedLines.slice(0, 40));
    console.groupEnd();
  }

  const sections = buildSections(cleanedLines);
  const sectionMap = new Map(sections.map((section) => [section.label, section.lines]));

  const client = mergeLines(sectionMap.get('client') ?? []);
  const onLines = sectionMap.get('on') ?? [];
  const dateLine = onLines[0] ?? '';
  const locationLines = onLines.slice(1);
  const { venueName, venueAddress } = deriveVenue(locationLines);
  // Try multiple variations of invoice number field - handle exact PDF format
  const invoiceNumber =
    (sectionMap.get('invoice #:') ?? [])[0] ??
    (sectionMap.get('invoice #') ?? [])[0] ??
    (sectionMap.get('invoice') ?? [])[0] ??
    (sectionMap.get('invoice number') ?? [])[0] ??
    '';
  console.log('Invoice number extracted:', invoiceNumber);
  console.log('Section map keys:', Array.from(sectionMap.keys()));
  console.log('Section map contents:', Object.fromEntries(sectionMap));

  // Debug: Check if any keys contain "invoice"
  const invoiceKeys = Array.from(sectionMap.keys()).filter((key) =>
    key.toLowerCase().includes('invoice')
  );
  console.log("Keys containing 'invoice':", invoiceKeys);

  // Debug: Look for invoice in raw text
  const invoiceLines = cleanedLines.filter((line) => line.toLowerCase().includes('invoice'));
  console.log("Lines containing 'invoice':", invoiceLines);
  const noteLines = sectionMap.get('notes') ?? [];
  const timeline = sectionMap.get('timeline / key moments') ?? [];
  const normalizedNotes = noteLines.map(normalizeWhitespace).filter(Boolean);
  const timelineEntries = buildTimelineEntries(timeline);

  const experienceLine = findExperienceLine(cleanedLines);
  const menuItems = extractMenuItems(cleanedLines);

  const headcount = deriveHeadcount(menuItems, cleanedLines);
  const serviceStyle = deriveServiceStyle(experienceLine, menuItems);
  const allergens = deriveAllergens(menuItems, normalizedNotes);
  const kits = deriveKits(menuItems, cleanedLines);
  const { startTime, endTime } = deriveTimes(timeline, timelineEntries);

  const eventNumber = invoiceNumber || buildFallbackNumber(client, dateLine, options.sourceName);
  console.log('Final event number:', eventNumber);
  const eventId = `evt-${slugify(eventNumber)}`;

  const baseEvent: Event = {
    id: eventId,
    number: eventNumber,
    client: client || 'Unknown Client',
    date: normalizeDate(dateLine),
    venue: {
      name: venueName || 'Unspecified Venue',
      address: venueAddress,
    },
    times: {
      start: startTime ?? '',
      end: endTime ?? '',
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
    status: 'draft',
  };

  const event: Event = {
    ...baseEvent,
    checklist: buildInitialChecklist(baseEvent),
  };

  const diagnostics = evaluateMenuDiagnostics(event, menuItems, {
    headcount,
    sourceName: options.sourceName,
  });

  const warnings = collectWarnings(
    event,
    { invoiceNumber, venueAddress, startTime: startTime ?? '', endTime: endTime ?? '' },
    diagnostics.warnings
  );

  return {
    event,
    warnings,
    timeline,
    normalizedNotes,
    flags: diagnostics.flags,
    reviewItems: diagnostics.reviewItems,
  };
}

interface Section {
  label: string;
  lines: string[];
}

function preprocessLines(lines: string[]): string[] {
  return lines.map((line) => line.replace(/�/g, '').trim()).filter(Boolean);
}

function buildSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    // Check for section header with value on same line (e.g., "Invoice #: 5806")
    const sameLineMatch = line.match(/^(.+?):\s*(.+)$/);
    if (sameLineMatch) {
      const label = normalizeLabel(sameLineMatch[1]);
      const value = sameLineMatch[2].trim();
      current = { label, lines: value ? [value] : [] };
      sections.push(current);
      continue;
    }

    // Check for section header on its own line (e.g., "Client:")
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

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, ' ').trim();
}

function mergeLines(lines: string[]): string {
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

function deriveVenue(lines: string[]): { venueName: string; venueAddress: string } {
  const nameParts: string[] = [];
  const addressParts: string[] = [];

  for (const line of lines) {
    if (addressParts.length === 0 && !/[0-9]/.test(line)) {
      nameParts.push(line);
    } else {
      addressParts.push(line);
    }
  }

  if (nameParts.length === 0 && addressParts.length > 0) {
    nameParts.push(addressParts.shift() ?? '');
  }

  return {
    venueName: nameParts.join(' ').trim(),
    venueAddress: addressParts.join('\n'),
  };
}

function findExperienceLine(lines: string[]): string {
  const experience = lines.find((line) => /experience\s*:?$/i.test(line));
  return experience ? experience.replace(/\s*:?$/, '').trim() : '';
}

function extractMenuItems(lines: string[]): MenuItem[] {
  const headerIndex = lines.findIndex((line) => /^quantity\/unit$/i.test(line));
  if (headerIndex === -1) {
    return [];
  }

  const items: MenuItem[] = [];
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

    const categoryParts: string[] = [currentLine];
    index += 1;
    while (index < lines.length && isCategoryContinuation(lines[index], categoryParts)) {
      categoryParts.push(lines[index]);
      index += 1;
    }

    const rawCategory = normalizeWhitespace(categoryParts.join(' '));
    if (!rawCategory) {
      continue;
    }

    const categoryMeta = deriveCategoryMetadata(rawCategory);

    const nameLines: string[] = [];
    const calloutLines: string[] = [];

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

    const rawName = normalizeWhitespace(nameLines.join(' '));
    const normalizedName = normalizeDishName(rawName || rawCategory);

    const quantityLines: string[] = [];
    while (index < lines.length && /^P:\s*/i.test(lines[index])) {
      quantityLines.push(lines[index]);
      index += 1;
    }

    const trailingLines: string[] = [];
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

const INSTRUCTION_PREFIXES = [
  'MAKE',
  'PORTION',
  'ADD',
  'PULL',
  'MARINATE',
  'MARINADE',
  'SLICE',
  'DICE',
  'GRILL',
  'COOK',
  'HEAT',
  'WRAP',
  'SEND',
  'KEEP',
  'PLACE',
  'PACK',
  'BUILD',
  'TOSS',
  'PROOF',
  'BAKE',
  'CUT',
  'REST',
  'WARM',
  'SET',
  'PREP',
  'LABEL',
  'STORE',
  'COMBINE',
  'ASSEMBLE',
  'GARNISH',
  'PLATE',
  'HOLD',
  'CHECK',
  'PICK',
  'DELIVER',
  'FINISH',
  'REMOVE',
  'CLEAN',
  'BLEND',
  'CHOP',
  'WHISK',
  'POACH',
  'BOIL',
  'SAUTE',
  'SAUT',
  'SIMMER',
];

const ACRONYM_KEEP = new Set([
  'BBQ',
  'GF',
  'DF',
  'V',
  'VG',
  'VEG',
  'DIY',
  'VIP',
  'AI',
  'BLT',
  'P',
  'GF/V',
  'GF/VG',
  'GF/DF',
  'MTO',
]);

function isColumnHeading(line: string): boolean {
  const normalized = normalizeWhitespace(line).toLowerCase();
  return (
    normalized === 'category' ||
    normalized === 'item' ||
    normalized.startsWith('special, production') ||
    normalized.includes('production notes') ||
    normalized === 'special' ||
    normalized === 'quantity/unit' ||
    normalized === 'quantity' ||
    normalized === 'unit'
  );
}

function isFooterLine(line: string): boolean {
  const normalized = normalizeWhitespace(line).toLowerCase();
  if (!normalized) return false;
  return (
    normalized.startsWith('printed date') ||
    normalized === 'page' ||
    normalized === 'of' ||
    normalized.startsWith('site') ||
    normalized.startsWith('client') ||
    normalized.startsWith('phone') ||
    normalized.startsWith('fax') ||
    normalized.startsWith('driver') ||
    normalized.startsWith('invoice #') ||
    normalized === 'notes:' ||
    normalized.startsWith('pricing menus') ||
    normalized.startsWith('mangia catering menu experience')
  );
}

function isCategoryContinuation(candidate: string | undefined, parts: string[]): boolean {
  if (!candidate) return false;
  const trimmed = normalizeWhitespace(candidate);
  if (!trimmed) return false;
  if (isColumnHeading(trimmed) || /^P:\s*/i.test(trimmed) || isFooterLine(trimmed)) {
    return false;
  }
  if (looksLikeInstruction(trimmed)) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (parts.length === 1) {
    const first = normalizeWhitespace(parts[0]).toLowerCase();
    if (first.endsWith('-')) return true;
    if (first.split(/\s+/).length === 1 && trimmed.split(/\s+/).length === 1) {
      return true;
    }
  }
  return trimmed.length <= 28 && /^[a-z0-9&()\/-\s]+$/i.test(trimmed) && !lower.includes('serving');
}

function isLikelyCategoryStart(line: string, currentCategory: string): boolean {
  const trimmed = normalizeWhitespace(line);
  if (!trimmed) return false;
  if (isColumnHeading(trimmed) || isFooterLine(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  if (/^(site|client|notes|invoice|driver|phone|fax)[:]?$/i.test(trimmed)) return true;
  if (lower === currentCategory.toLowerCase()) return true;
  if (
    lower.includes('finish at event') ||
    lower.includes('finish at kitchen') ||
    lower.includes('drop off') ||
    lower.includes('action station') ||
    lower.includes('passed') ||
    lower.includes('dessert') ||
    lower.includes('beverage')
  ) {
    return true;
  }
  return false;
}

function shouldContinueName(line: string, nameLineCount: number): boolean {
  const trimmed = normalizeWhitespace(line);
  if (!trimmed) return false;
  if (looksLikeInstruction(trimmed)) return false;
  if (/^P:\s*/i.test(trimmed)) return false;
  if (nameLineCount === 0) return true;
  if (/^[A-Z0-9&'()\/-]+$/.test(trimmed) && trimmed.length <= 34) return true;
  if (!/[a-z]/.test(trimmed) && trimmed.length <= 34) return true;
  if (nameLineCount < 2 && trimmed.length <= 40 && /^[A-Za-z0-9 &'()\/-]+$/.test(trimmed))
    return true;
  return false;
}

function looksLikeInstruction(line: string): boolean {
  const upper = normalizeWhitespace(line).toUpperCase();
  if (!upper) return false;
  if (/^[0-9]/.test(upper)) return true;
  if (upper.startsWith('***')) return true;
  if (upper.includes(' RECIPE')) return true;
  return INSTRUCTION_PREFIXES.some((prefix) => upper.startsWith(`${prefix} `));
}

function normalizeDishName(name: string): string {
  const cleaned = normalizeWhitespace(name);
  if (!cleaned) return '';
  if (/^[A-Z0-9 &'()\/-]+$/.test(cleaned) && /[A-Z]/.test(cleaned)) {
    return toTitleCasePreservingAcronyms(cleaned);
  }
  return cleaned;
}

function toTitleCasePreservingAcronyms(value: string): string {
  const segments = value
    .toLowerCase()
    .split(/(\s+|[-\/])/)
    .map((segment) => {
      if (!segment) return segment;
      if (/^\s+$/.test(segment) || segment === '-' || segment === '/') return segment;
      const upper = segment.toUpperCase();
      if (ACRONYM_KEEP.has(upper) || upper.length <= 2) {
        return upper;
      }
      return upper.charAt(0) + upper.slice(1).toLowerCase();
    });
  return segments
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

interface QuantityParseResult {
  primaryQuantity: { value: number; unit: string };
  details: MenuQuantityDetail[];
  specials: string[];
  prepInstructions: string[];
  warnings: string[];
}

function parseQuantitySegments(
  quantityLines: string[],
  trailingLines: string[]
): QuantityParseResult {
  const details: MenuQuantityDetail[] = [];
  const specials: string[] = [];
  const prepInstructions: string[] = [];
  const warnings: string[] = [];

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
      const unitLineRaw = trailingLines[idx + 1] ? normalizeWhitespace(trailingLines[idx + 1]) : '';
      const noteLineRaw = trailingLines[idx + 2] ? normalizeWhitespace(trailingLines[idx + 2]) : '';

      if (unitLineRaw && isLikelyUnit(unitLineRaw)) {
        const value = parseFloat(current);
        if (!Number.isNaN(value)) {
          const detail: MenuQuantityDetail = {
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

function parsePortionLine(line: string, warnings: string[]): MenuQuantityDetail | null {
  const match = line.match(/^P:\s*([\d.,]+)\s*(.*)$/i);
  if (!match) {
    warnings.push(`Unrecognized quantity format: "${line}"`);
    return null;
  }
  const value = parseFloat(match[1].replace(/,/g, ''));
  if (Number.isNaN(value)) {
    warnings.push(`Unable to parse quantity number from "${line}"`);
    return null;
  }
  const unit = normalizeWhitespace(match[2]) || 'serving';
  return {
    value,
    unit,
    label: 'Portion',
    raw: line,
  };
}

function selectPrimaryQuantity(details: MenuQuantityDetail[]): { value: number; unit: string } {
  if (details.length === 0) {
    return { value: 0, unit: '' };
  }
  const servingDetail = details.find((detail) => /serv/i.test(detail.unit));
  const base = servingDetail ?? details[0];
  return {
    value: Number.isFinite(base.value) ? base.value : 0,
    unit: base.unit || 'serving',
  };
}

function isLikelyUnit(value: string): boolean {
  if (!value) return false;
  if (value.length > 20) return false;
  if (/[0-9]/.test(value)) return false;
  return /^[a-z#\s/]+$/i.test(value);
}

function buildPreparationNotes(lines: string[]): string | undefined {
  if (lines.length === 0) {
    return undefined;
  }
  const formatted = lines.map((line) => toSentenceCase(line)).filter(Boolean);
  if (formatted.length === 0) {
    return undefined;
  }
  return formatted.join(' ');
}

function toSentenceCase(value: string): string {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  return trimmed.charAt(0).toUpperCase() + lower.slice(1);
}

function deriveCategoryMetadata(category: string): {
  label: string;
  path: string[];
  group?: string;
  serviceLocation?: MenuItem['serviceLocation'];
  badges: string[];
  sortOrder: number;
} {
  const normalized = normalizeWhitespace(category);
  if (!normalized) {
    return { label: '', path: [], badges: [], sortOrder: 999 };
  }

  const segments = normalized
    .split(/\s*-\s*/)
    .map((segment) => toTitleCasePreservingAcronyms(segment));
  const lower = normalized.toLowerCase();

  let serviceLocation: MenuItem['serviceLocation'] = 'other';
  if (lower.includes('finish at event')) serviceLocation = 'finish_at_event';
  else if (lower.includes('finish at kitchen')) serviceLocation = 'finish_at_kitchen';
  else if (lower.includes('action station')) serviceLocation = 'action_station';
  else if (lower.includes('drop off')) serviceLocation = 'drop_off';

  const group = segments[0] ? toTitleCasePreservingAcronyms(segments[0]) : undefined;

  const badges = new Set<string>();
  switch (serviceLocation) {
    case 'finish_at_event':
      badges.add('Finish @ Event');
      break;
    case 'finish_at_kitchen':
      badges.add('Finish @ Kitchen');
      break;
    case 'action_station':
      badges.add('Action Station');
      break;
    case 'drop_off':
      badges.add('Drop Off');
      break;
    default:
      break;
  }

  if (lower.includes('passed')) {
    badges.add('Passed');
  }
  if (lower.includes('chef') || lower.includes('station')) {
    badges.add('Chef Station');
  }

  const label =
    segments.length > 0 ? segments.join(' - ') : toTitleCasePreservingAcronyms(normalized);
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

function computeCategorySortOrder(
  serviceLocation: MenuItem['serviceLocation'],
  lowerCategory: string,
  label: string
): number {
  if (lowerCategory.includes('passed')) return 10;
  if (lowerCategory.includes('apps') || lowerCategory.includes('appetizer')) return 20;
  if (serviceLocation === 'action_station') return 30;
  if (lowerCategory.includes('station')) return 35;
  if (serviceLocation === 'finish_at_event') return 40;
  if (serviceLocation === 'finish_at_kitchen') return 50;
  if (lowerCategory.includes('entree') || lowerCategory.includes('main')) return 60;
  if (lowerCategory.includes('side') || lowerCategory.includes('salad')) return 70;
  if (lowerCategory.includes('dessert') || lowerCategory.includes('sweet')) return 80;
  if (
    lowerCategory.includes('beverage') ||
    lowerCategory.includes('drink') ||
    lowerCategory.includes('bar')
  )
    return 90;
  if (serviceLocation === 'drop_off') return 100;
  return 200 + (label ? label.toLowerCase().charCodeAt(0) : 0);
}

function normalizeWhitespace(value: string): string {
  return value ? value.replace(/\s+/g, ' ').trim() : '';
}

function isItemBoundary(line: string): boolean {
  const normalized = line.toLowerCase();
  if (
    /^category$/.test(normalized) ||
    /^item$/.test(normalized) ||
    /^printed date/.test(normalized)
  ) {
    return true;
  }
  return /^P:\s*/i.test(line);
}

function deriveHeadcount(menuItems: MenuItem[], allLines: string[]): number {
  const candidates: number[] = [];

  for (const item of menuItems) {
    if (item.qty && /serv/i.test(item.qty.unit) && item.qty.value) {
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
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (value > 0) {
        candidates.push(value);
      }
    }
  }

  const sorted = candidates.filter((value) => value > 0).sort((a, b) => b - a);
  return sorted[0] ? Math.round(sorted[0]) : 0;
}

function deriveServiceStyle(experience: string, menuItems: MenuItem[]): string {
  if (experience) {
    return experience;
  }

  const categories = new Set(menuItems.map((item) => item.category.toLowerCase()));
  if ([...categories].some((category) => category.includes('drop off'))) {
    return 'Drop Off';
  }
  if (
    [...categories].some((category) => category.includes('finish at event')) &&
    [...categories].some((category) => category.includes('finish at kitchen'))
  ) {
    return 'Action Station + Custom';
  }
  if ([...categories].some((category) => category.includes('apps'))) {
    return 'Plated Service';
  }
  return 'Catering Service';
}

function deriveAllergens(menuItems: MenuItem[], notes: string[]): string[] {
  const allergenSet = new Set<string>();
  const sources = [
    ...menuItems.flatMap((item) =>
      (item.specials ?? []).concat(item.preparationNotes ? [item.preparationNotes] : [])
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

function deriveKits(menuItems: MenuItem[], lines: string[]): string[] {
  const kitSet = new Set<string>();
  const candidates = [
    ...menuItems.map((item) => `${item.category} ${item.name}`),
    ...menuItems.flatMap((item) =>
      item.preparationNotes ? item.preparationNotes.split('\n') : []
    ),
    ...lines,
  ];

  for (const text of candidates) {
    const lower = text.toLowerCase();
    if (/(chafer|sternos?)/i.test(lower)) kitSet.add('Chafers + Sterno');
    if (/(plasticware|utensil|fork|spoon|knife)/i.test(lower)) kitSet.add('Disposable Utensils');
    if (/pizza/i.test(lower)) kitSet.add('Pizza Equipment');
    if (/taco/i.test(lower)) kitSet.add('Taco Station Kit');
    if (/action station/i.test(lower)) kitSet.add('Action Station Kit');
    if (/bread|roll/i.test(lower)) kitSet.add('Bread Baskets');
    if (/carv/i.test(lower)) kitSet.add('Carving Knives');
    if (/induction|burner/i.test(lower)) kitSet.add('Induction Burners');
    if (/water service/i.test(lower)) kitSet.add('Table Service Kit');
  }

  return [...kitSet].sort();
}

function buildTimelineEntries(lines: string[]): EventTimelineEntry[] {
  const entries: EventTimelineEntry[] = [];
  for (const line of lines) {
    const entry = parseTimelineLine(line);
    if (entry) {
      entries.push(entry);
    }
  }
  return entries;
}

function parseTimelineLine(line: string): EventTimelineEntry | null {
  const raw = normalizeWhitespace(line);
  if (!raw) {
    return null;
  }

  const rangeRegex =
    /(\d{1,2}(?::\d{2})?)\s*(a\.m\.|p\.m\.|am|pm)?\s*(?:-|–|—|to|through|until)\s*(\d{1,2}(?::\d{2})?)\s*(a\.m\.|p\.m\.|am|pm)?/i;
  const rangeMatch = rangeRegex.exec(raw);
  if (rangeMatch) {
    const [matchText, startRaw, startMeridiem, endRaw, endMeridiem] = rangeMatch;
    const startMinutes = toMinutes(startRaw, startMeridiem);
    const endMinutes = toMinutes(endRaw, endMeridiem || startMeridiem);
    const beforeRaw = raw.slice(0, rangeMatch.index);
    const afterRaw = raw.slice(rangeMatch.index + matchText.length);
    const before = cleanupTimelineLabel(beforeRaw);
    const after = cleanupTimelineLabel(afterRaw);
    const label = [before, after].filter(Boolean).join(' ').trim() || 'Timeline item';
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

  const singleRegex = /(\d{1,2}(?::\d{2})?)\s*(a\.m\.|p\.m\.|am|pm)/i;
  const singleMatch = singleRegex.exec(raw);
  if (singleMatch) {
    const [matchText, timeRaw, meridiem] = singleMatch;
    const minutes = toMinutes(timeRaw, meridiem);
    const beforeRaw = raw.slice(0, singleMatch.index);
    const afterRaw = raw.slice(singleMatch.index + matchText.length);
    const before = cleanupTimelineLabel(beforeRaw);
    const after = cleanupTimelineLabel(afterRaw);
    const label = [before, after].filter(Boolean).join(' ').trim() || 'Timeline item';
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

  return {
    label: raw,
    phase: categorizeTimelinePhase(raw),
    raw,
  };
}

function cleanupTimelineLabel(value: string): string {
  return value
    .replace(/^[:\s\-–—]+/, '')
    .replace(/[:\s\-–—]+$/, '')
    .trim();
}

function formatMinutesLabel(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const minutesInDay = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(minutesInDay / 60);
  const minutes = minutesInDay % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${suffix}`;
}

function categorizeTimelinePhase(text: string): TimelinePhase {
  const value = text.toLowerCase();
  if (!value) {
    return 'other';
  }
  if (
    /(setup|set[-\s]?up|arrival|arrive|load\s?in|prep|staging|deliver|drop[-\s]?off|crew call|call time)/.test(
      value
    )
  ) {
    return 'setup';
  }
  if (
    /(ceremony|service|serve|dinner|lunch|meal|buffet|reception|cocktail|program|toast|bar|course|plated|dessert|hour)/.test(
      value
    )
  ) {
    return 'service';
  }
  if (
    /(teardown|tear[-\s]?down|load\s?out|strike|clean|cleanup|wrap|depart|end|breakdown|reset)/.test(
      value
    )
  ) {
    return 'teardown';
  }
  return 'other';
}

function deriveTimes(
  timelineLines: string[],
  parsedEntries?: EventTimelineEntry[]
): { startTime: string | undefined; endTime: string | undefined } {
  const minutes: number[] = [];

  if (parsedEntries && parsedEntries.length > 0) {
    for (const entry of parsedEntries) {
      if (typeof entry.minutes === 'number' && !Number.isNaN(entry.minutes)) {
        minutes.push(entry.minutes);
      }
      if (typeof entry.endMinutes === 'number' && !Number.isNaN(entry.endMinutes)) {
        minutes.push(entry.endMinutes);
      }
    }
  }

  if (minutes.length === 0) {
    for (const line of timelineLines) {
      const rangeMatch = line.match(
        /(\d{1,2}(?::\d{2})?)(?:\s*(a\.m\.|p\.m\.|am|pm)?)\s*(?:-|–|—)\s*(\d{1,2}(?::\d{2})?)\s*(a\.m\.|p\.m\.|am|pm)?/i
      );
      if (rangeMatch) {
        const [, start, startMeridiem, end, endMeridiem] = rangeMatch;
        const startMinutes = toMinutes(start, startMeridiem);
        const endMinutes = toMinutes(end, endMeridiem || startMeridiem);
        if (startMinutes !== null) minutes.push(startMinutes);
        if (endMinutes !== null) minutes.push(endMinutes);
        continue;
      }

      const singleMatch = line.match(/(\d{1,2}(?::\d{2})?)\s*(a\.m\.|p\.m\.|am|pm)/i);
      if (singleMatch) {
        const [, time, meridiem] = singleMatch;
        const value = toMinutes(time, meridiem);
        if (value !== null) minutes.push(value);
      }
    }
  }

  const sorted = [...new Set(minutes)].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { startTime: '', endTime: '' };
  }

  const format = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutesPart = mins % 60;
    return `${hours.toString().padStart(2, '0')}:${minutesPart.toString().padStart(2, '0')}`;
  };

  const startTime = format(sorted[0]);
  const endTime = sorted.length > 1 ? format(sorted[sorted.length - 1]) : '';

  return { startTime, endTime };
}

function toMinutes(time: string, meridiem?: string | null): number | null {
  const normalized = normalizeWhitespace(time);
  if (!normalized) {
    return null;
  }

  let hours: number;
  let minutes: number;

  if (normalized.includes(':')) {
    const [hoursStr, minutesStr] = normalized.split(':');
    hours = parseInt(hoursStr, 10);
    minutes = parseInt(minutesStr, 10);
  } else if (/^\d{3,4}$/.test(normalized)) {
    hours = parseInt(normalized.slice(0, -2), 10);
    minutes = parseInt(normalized.slice(-2), 10);
  } else {
    hours = parseInt(normalized, 10);
    minutes = 0;
  }

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  minutes = Math.max(0, Math.min(minutes, 59));

  let adjustedHours: number;

  if (meridiem) {
    adjustedHours = hours % 12;
    const lower = meridiem.toLowerCase();
    if (lower.includes('p') && adjustedHours < 12) {
      adjustedHours += 12;
    }
    if (lower.includes('a') && adjustedHours === 12) {
      adjustedHours = 0;
    }
  } else {
    if (hours === 0) {
      adjustedHours = 0;
    } else if (hours >= 1 && hours <= 3) {
      adjustedHours = hours + 12;
    } else if (hours >= 4 && hours < 24) {
      adjustedHours = hours;
    } else {
      adjustedHours = hours % 24;
    }
  }

  return adjustedHours * 60 + minutes;
}

function normalizeDate(input: string): string {
  if (!input) return '';
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const fallbackMatch = input.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (fallbackMatch) {
    const [, month, day, year] = fallbackMatch;
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    return `${normalizedYear.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return '';
}

function buildFallbackNumber(client: string, dateLine: string, sourceName: string): string {
  const base = [client, dateLine || sourceName]
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)
    .join('-');
  return base || `FILE-${sourceName}`;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug) {
    return slug;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function evaluateMenuDiagnostics(
  event: Event,
  items: MenuItem[],
  context: { headcount: number; sourceName: string }
): { flags: Flag[]; reviewItems: ReviewQueueItem[]; warnings: string[] } {
  const flags: Flag[] = [];
  const reviewItems: ReviewQueueItem[] = [];
  const warnings: string[] = [];
  let issueCounter = 0;

  for (const item of items) {
    if (item.warnings && item.warnings.length > 0) {
      item.warnings.forEach((warning) => {
        warnings.push(`${item.name}: ${warning}`);
      });
    }
  }

  const missingQuantityItems = items.filter((item) => item.qty.value === 0);
  for (const item of missingQuantityItems) {
    issueCounter += 1;
    const flagCode = `MENU_QTY_MISSING_${issueCounter}`;
    flags.push({
      code: flagCode,
      severity: 'medium',
      message: `Menu item "${item.name}" is missing a portion quantity (source: ${context.sourceName})`,
      evidenceRef: ['parser_quantity_scan'],
      resolved: false,
      autoResolution: 'Confirm portion count in source document',
    });
    reviewItems.push({
      id: `${event.id}-qty-${issueCounter}`,
      eventId: event.id,
      type: 'validation',
      issue: `Quantity missing for "${item.name}"`,
      suggestedResolution: 'Confirm portion count and update the menu item.',
      requiresHuman: true,
      priority: 2,
    });
  }

  const conflictingQuantityItems = items.filter((item) => {
    if (!item.quantityDetails || item.quantityDetails.length < 2) return false;
    const portionUnits = item.quantityDetails
      .filter(
        (detail) =>
          (detail.label ?? '').toLowerCase().includes('portion') || /serv/i.test(detail.unit)
      )
      .map((detail) => detail.unit.toLowerCase());
    return new Set(portionUnits).size > 1;
  });

  for (const item of conflictingQuantityItems) {
    issueCounter += 1;
    const flagCode = `MENU_QTY_CONFLICT_${issueCounter}`;
    const units = item.quantityDetails
      ?.map((detail) => detail.unit)
      .filter(Boolean)
      .join(', ');
    flags.push({
      code: flagCode,
      severity: 'medium',
      message: `Menu item "${item.name}" has conflicting portion units: ${units}`,
      evidenceRef: ['parser_quantity_scan'],
      resolved: false,
    });
    reviewItems.push({
      id: `${event.id}-qty-conflict-${issueCounter}`,
      eventId: event.id,
      type: 'ambiguity',
      issue: `Conflicting portion units for "${item.name}"`,
      suggestedResolution: 'Choose the correct portion unit and adjust quantities.',
      requiresHuman: true,
      priority: 3,
    });
  }

  if (context.headcount <= 0 && items.length > 0) {
    issueCounter += 1;
    flags.push({
      code: 'HEADCOUNT_MISSING',
      severity: 'high',
      message: `Headcount was not detected but ${items.length} menu items were parsed.`,
      evidenceRef: ['parser_headcount_scan'],
      resolved: false,
      autoResolution: 'Verify guest count within the source PDF.',
    });
    reviewItems.push({
      id: `${event.id}-headcount-${issueCounter}`,
      eventId: event.id,
      type: 'validation',
      issue: 'Headcount missing while menu items are present',
      suggestedResolution: 'Confirm guest count and update the event.',
      requiresHuman: true,
      priority: 1,
    });
  }

  const totalServings = items
    .filter((item) => /serv/i.test(item.qty.unit) && item.qty.value > 0)
    .reduce((sum, item) => sum + item.qty.value, 0);

  if (context.headcount > 0 && totalServings > 0) {
    const diff = Math.abs(totalServings - context.headcount);
    if (diff > Math.max(5, context.headcount * 0.15)) {
      const warningMessage = `Total servings (${Math.round(totalServings)}) differ from headcount (${context.headcount}) by ${Math.round(diff)}.`;
      warnings.push(warningMessage);
      reviewItems.push({
        id: `${event.id}-servings-check`,
        eventId: event.id,
        type: 'validation',
        issue: warningMessage,
        suggestedResolution: 'Verify guest count against portion totals.',
        requiresHuman: false,
        priority: 3,
      });
    }
  }

  return { flags, reviewItems, warnings };
}

function collectWarnings(
  event: Event,
  context: { invoiceNumber: string; venueAddress: string; startTime: string; endTime: string },
  extraWarnings: string[] = []
): string[] {
  const warnings: string[] = [];
  if (!context.invoiceNumber) warnings.push('Missing invoice number');
  if (!event.client) warnings.push('Missing client name');
  if (!event.date) warnings.push('Missing event date');
  if (!event.venue.name) warnings.push('Missing venue name');
  if (!context.venueAddress) warnings.push('Venue address could not be extracted');
  if (!context.startTime || !context.endTime) warnings.push('Event time window is incomplete');
  if (event.menuSections.length === 0) warnings.push('No menu items were detected');
  return [...warnings, ...extraWarnings];
}

function detectAllergens(texts: string[]): string[] {
  const allergenRules: Record<string, RegExp[]> = {
    gluten: [/gluten/i, /\bgf\b/i, /crostini/i, /bread/i, /roll/i],
    dairy: [/dairy/i, /cheese/i, /butter/i, /cream/i, /ricotta/i, /whipped/i],
    nut: [/nut/i, /pecan/i, /almond/i, /walnut/i],
    shellfish: [/shrimp/i, /lobster/i, /crab/i, /shellfish/i],
    egg: [/egg/i, /aioli/i],
    soy: [/soy/i, /tofu/i, /edamame/i],
    vegetarian: [/vegetarian/i, /veg\b/i, /plant-forward/i],
    vegan: [/vegan/i, /plant-based/i],
  };

  const detected = new Set<string>();
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

// ── Adapter: ParsedEventResult → ParsedDocumentResult ───────────────────────

export function detectTppFormat(lines: string[]): boolean {
  const text = lines.join(' ').toLowerCase();
  return (
    text.includes('invoice') ||
    text.includes('timeline / key moments') ||
    (text.includes('client') && text.includes('venue'))
  );
}

export function parseTppDocument(lines: string[], sourceName = 'document'): ParsedDocumentResult {
  try {
    const result = parseTppEvent(lines, { sourceName });
    const { event, warnings } = result;

    return {
      success: true,
      format: 'tpp',
      confidence: event.client && event.number ? 'high' : 'medium',
      data: {
        meta: {
          event_name: event.client || '',
          event_number: event.number || '',
          event_date: event.date || null,
          venue_name: event.venue?.name || '',
          venue_address: event.venue?.address || '',
          headcount: event.headcount || 0,
          service_style: event.serviceStyle || '',
          staff_parking: '',
          staff_restrooms: '',
        },
        staff: (event.staffing || []).map((shift, idx) => ({
          name: shift.name,
          role: shift.position || 'Staff',
          shift_start: shift.scheduledIn || '',
          shift_end: shift.scheduledOut || '',
          station: inferStationFromPosition(shift.position || ''),
          sort_order: idx,
        })),
        timeline: (event.timeline || []).map((entry, idx) => ({
          time: entry.time || '',
          item: entry.label || '',
          team: '',
          location: '',
          style: entry.phase || 'other',
          notes: entry.description || '',
          highlighted: entry.phase === 'service',
          sort_order: idx,
        })),
        layouts: [],
      },
      warnings,
    };
  } catch (err) {
    return {
      success: false,
      format: 'tpp',
      confidence: 'low',
      data: { meta: {}, staff: [], timeline: [], layouts: [] },
      warnings: [],
      error: err instanceof Error ? err.message : 'TPP parsing failed',
    };
  }
}

function inferStationFromPosition(position: string): string {
  const lower = position.toLowerCase();
  if (lower.includes('chef') || lower.includes('cook') || lower.includes('boh')) return 'Kitchen';
  if (lower.includes('server') || lower.includes('waiter') || lower.includes('foh')) return 'Front of House';
  if (lower.includes('bartender') || lower.includes('bar')) return 'Bar';
  if (lower.includes('captain') || lower.includes('lead')) return 'Lead';
  return 'General';
}
