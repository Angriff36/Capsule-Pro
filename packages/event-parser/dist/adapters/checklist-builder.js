/**
 * Checklist Builder
 * Builds Pre-Event Review checklist from parsed event data
 * Auto-fills answers based on extracted information
 */
import { EVENT_TYPE_OPTIONS } from "../types/checklist.js";
const CHECKLIST_VERSION = "2025-01-27";
/**
 * Build initial checklist with auto-filled answers from parsed event
 */
export function buildInitialChecklist(event) {
    const generatedAt = new Date().toISOString();
    const warnings = [];
    const missingFields = [];
    const sections = [
        buildBasicInfoSection(event),
        buildMenuSection(event),
        buildStaffingSection(event),
        buildTimelineSection(event),
        buildEquipmentSection(event),
        buildAdditionalSection(event),
    ];
    const completion = computeChecklistCompletion(sections);
    // Count auto-filled questions and total questions
    let autoFilledCount = 0;
    let totalQuestions = 0;
    for (const section of sections) {
        for (const question of section.questions) {
            totalQuestions++;
            if (question.autoFilled && question.value !== null) {
                autoFilledCount++;
            }
            if (question.required && question.value === null) {
                missingFields.push(`${section.title}: ${question.prompt}`);
            }
        }
    }
    // Add warnings for missing critical data
    if (!event.menuSections || event.menuSections.length === 0) {
        warnings.push("No menu data found in parsed event");
    }
    if (!event.staffing || event.staffing.length === 0) {
        warnings.push("No staffing data found in parsed event");
    }
    if (!event.timeline || event.timeline.length === 0) {
        warnings.push("No timeline data found in parsed event");
    }
    const checklist = {
        version: CHECKLIST_VERSION,
        generatedAt,
        updatedAt: generatedAt,
        sections,
        completion,
    };
    return {
        checklist,
        autoFilledCount,
        totalQuestions,
        warnings,
        missingFields,
    };
}
/**
 * Update a single question in the checklist
 */
export function updateChecklistQuestion(checklist, questionId, updates) {
    let changed = false;
    const sections = checklist.sections.map((section) => ({
        ...section,
        questions: section.questions.map((question) => {
            if (question.id !== questionId) {
                return question;
            }
            const nextValue = updates.value !== undefined ? updates.value : question.value;
            const nextNotes = updates.notes !== undefined
                ? (updates.notes ?? undefined)
                : question.notes;
            const sameValue = nextValue === question.value;
            const sameNotes = (nextNotes ?? "") === (question.notes ?? "");
            if (sameValue && sameNotes) {
                return question;
            }
            changed = true;
            return {
                ...question,
                value: nextValue,
                notes: nextNotes,
                autoFilled: false,
            };
        }),
    }));
    if (!changed) {
        return checklist;
    }
    const updatedAt = new Date().toISOString();
    const completion = computeChecklistCompletion(sections);
    return {
        ...checklist,
        sections,
        updatedAt,
        completion,
        completedAt: undefined,
    };
}
/**
 * Mark checklist as completed
 */
export function markChecklistCompleted(checklist) {
    if (checklist.completedAt) {
        return checklist;
    }
    const timestamp = new Date().toISOString();
    return {
        ...checklist,
        completedAt: timestamp,
        updatedAt: timestamp,
    };
}
/**
 * Reopen a completed checklist
 */
export function reopenChecklist(checklist) {
    if (!checklist.completedAt) {
        return checklist;
    }
    return {
        ...checklist,
        completedAt: undefined,
        updatedAt: new Date().toISOString(),
    };
}
/**
 * Check if a question has been answered
 */
export function isQuestionAnswered(question) {
    if (question.type === "single-select") {
        return Boolean(question.value);
    }
    if (question.type === "yes-no" || question.type === "yes-no-na") {
        return (question.value === "yes" ||
            question.value === "no" ||
            question.value === "na");
    }
    if (question.type === "text" || question.type === "textarea") {
        return Boolean(question.value && question.value.trim().length > 0);
    }
    return false;
}
/**
 * Compute completion percentage
 */
export function computeChecklistCompletion(sections) {
    const requiredQuestions = sections.flatMap((section) => section.questions.filter((q) => q.required));
    if (requiredQuestions.length === 0) {
        return 0;
    }
    const answered = requiredQuestions.filter((q) => isQuestionAnswered(q)).length;
    return Math.round((answered / requiredQuestions.length) * 100);
}
// --- Section Builders ---
function buildBasicInfoSection(event) {
    const eventType = inferEventType(event);
    const questions = [
        createQuestion({
            id: "event-type",
            type: "single-select",
            prompt: "What type of event is this?",
            description: "Circle the service style that best matches this event.",
            required: true,
            options: [...EVENT_TYPE_OPTIONS],
            value: eventType.value,
            autoReason: eventType.autoReason,
        }),
    ];
    return {
        id: "basic-info",
        title: "Basic Event Info",
        questions,
    };
}
function buildMenuSection(event) {
    const prepInstructions = detectPrepInstructions(event);
    const leadInstructions = detectEventLeadInstructions(event);
    const unfamiliarItems = detectUnfamiliarItems(event);
    const customMenu = detectCustomMenuItems(event);
    const quantityRecommendations = detectQuantityRecommendations(event);
    const cookedDifferently = detectCookedDifferently(event);
    const questions = [
        createQuestion({
            id: "menu-prep-instructions",
            type: "yes-no",
            prompt: "Any special instructions for service that need to pass to culinary team for prep?",
            required: true,
            allowNotes: true,
            value: prepInstructions.value,
            notes: prepInstructions.notes,
            autoReason: prepInstructions.autoReason,
        }),
        createQuestion({
            id: "menu-event-lead-instructions",
            type: "yes-no",
            prompt: "Any special instructions for service that need to pass to culinary event lead?",
            required: true,
            allowNotes: true,
            value: leadInstructions.value,
            notes: leadInstructions.notes,
            autoReason: leadInstructions.autoReason,
        }),
        createQuestion({
            id: "menu-unfamiliar-items",
            type: "yes-no",
            prompt: "Are there any unfamiliar or new menu items that need clarification?",
            required: true,
            allowNotes: true,
            value: unfamiliarItems.value,
            notes: unfamiliarItems.notes,
            autoReason: unfamiliarItems.autoReason,
        }),
        createQuestion({
            id: "menu-custom-items-present",
            type: "yes-no",
            prompt: 'Are there any "custom menu item" entries listed on menu production?',
            required: true,
            allowNotes: true,
            value: customMenu.present.value,
            notes: customMenu.present.notes,
            autoReason: customMenu.present.autoReason,
        }),
        createQuestion({
            id: "menu-custom-items-reviewed",
            type: "yes-no",
            prompt: "Have you reviewed the recipe for the custom menu items?",
            required: true,
            allowNotes: true,
            value: customMenu.reviewed.value,
            notes: customMenu.reviewed.notes,
            autoReason: customMenu.reviewed.autoReason,
        }),
        createQuestion({
            id: "menu-custom-item-questions",
            type: "yes-no",
            prompt: "Are there any questions regarding the custom menu items?",
            required: true,
            allowNotes: true,
            value: customMenu.questions.value,
            notes: customMenu.questions.notes,
            autoReason: customMenu.questions.autoReason,
        }),
        createQuestion({
            id: "menu-quantity-adjustments",
            type: "yes-no",
            prompt: "Are there any recommendations to the quantity of menu / prep that should be altered?",
            required: true,
            allowNotes: true,
            value: quantityRecommendations.value,
            notes: quantityRecommendations.notes,
            autoReason: quantityRecommendations.autoReason,
        }),
        createQuestion({
            id: "menu-cooked-differently",
            type: "yes-no",
            prompt: "Is there anything on the menu that will be cooked differently (e.g., frying, grill marking)?",
            required: false,
            allowNotes: true,
            value: cookedDifferently.value,
            notes: cookedDifferently.notes,
            autoReason: cookedDifferently.autoReason,
        }),
    ];
    return {
        id: "menu",
        title: "Menu",
        questions,
    };
}
function buildStaffingSection(event) {
    const staffing = summarizeStaffing(event);
    const prepTiming = detectPrepTiming(event);
    const questions = [
        createQuestion({
            id: "staff-culinary-lead",
            type: "text",
            prompt: "Culinary lead for this event",
            required: false,
            value: staffing.lead,
            autoReason: staffing.leadReason,
        }),
        createQuestion({
            id: "staff-support-team",
            type: "textarea",
            prompt: "Support staff assigned",
            required: false,
            value: staffing.support,
            autoReason: staffing.supportReason,
        }),
        createQuestion({
            id: "staff-prep-early",
            type: "yes-no",
            prompt: "Will this event need to be prepped earlier due to schedule/volume?",
            required: true,
            allowNotes: true,
            value: prepTiming.value,
            notes: prepTiming.notes,
            autoReason: prepTiming.autoReason,
        }),
    ];
    return {
        id: "staffing",
        title: "Schedule & Staff",
        questions,
    };
}
function buildTimelineSection(event) {
    const timeline = detectTimelineAdjustments(event);
    const questions = [
        createQuestion({
            id: "timeline-arrival-window",
            type: "single-select",
            prompt: "Is a different time frame needed onsite?",
            description: "Select whether arrival-to-service timing should change from policy.",
            required: true,
            options: ["No Change", "More", "Less"],
            value: timeline.value,
            notes: timeline.notes,
            autoReason: timeline.autoReason,
        }),
    ];
    return {
        id: "timeline",
        title: "Timeline",
        questions,
    };
}
function buildEquipmentSection(event) {
    const equipment = detectEquipmentNeeds(event);
    const questions = [
        createQuestion({
            id: "equipment-assigned",
            type: "yes-no",
            prompt: "All selected menu items have required items assigned to them.",
            required: true,
            allowNotes: true,
            value: equipment.value,
            notes: equipment.notes,
            autoReason: equipment.autoReason,
        }),
        createQuestion({
            id: "equipment-changes",
            type: "textarea",
            prompt: "Requested equipment changes needed",
            required: false,
            value: equipment.changes,
            autoReason: equipment.changesReason,
        }),
    ];
    return {
        id: "equipment",
        title: "Equipment",
        questions,
    };
}
function buildAdditionalSection(event) {
    const additional = detectAdditionalQuestions(event);
    const questions = [
        createQuestion({
            id: "additional-questions",
            type: "yes-no",
            prompt: "Any additional event questions?",
            required: true,
            allowNotes: true,
            value: additional.value,
            notes: additional.notes,
            autoReason: additional.autoReason,
        }),
    ];
    return {
        id: "additional",
        title: "Additional Questions",
        questions,
    };
}
// --- Question Creator ---
function createQuestion(params) {
    return {
        id: params.id,
        type: params.type,
        prompt: params.prompt,
        required: params.required,
        description: params.description,
        options: params.options,
        allowNotes: params.allowNotes,
        value: params.value ?? null,
        notes: params.notes,
        autoFilled: params.value != null,
        autoReason: params.autoReason,
    };
}
// --- Auto-Answer Detection Functions ---
function inferEventType(event) {
    const style = (event.serviceStyle || "").toLowerCase();
    if (!event.menuSections || event.menuSections.length === 0) {
        return {
            value: null,
            autoReason: "No menu data available; requires manual selection.",
        };
    }
    if (style.includes("drop")) {
        return {
            value: "Delivery / Drop Off",
            autoReason: `Service style is "${event.serviceStyle}".`,
        };
    }
    if (style.includes("action")) {
        return {
            value: "Action Station",
            autoReason: `Service style is "${event.serviceStyle}".`,
        };
    }
    if (style.includes("vending")) {
        return {
            value: "Vending",
            autoReason: `Service style is "${event.serviceStyle}".`,
        };
    }
    if (style.includes("custom")) {
        return {
            value: "Custom",
            autoReason: `Service style is "${event.serviceStyle}".`,
        };
    }
    // Analyze service locations in menu
    const serviceCounts = event.menuSections.reduce((acc, item) => {
        const key = item.serviceLocation ?? "other";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const dominantLocation = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (dominantLocation === "drop_off") {
        return {
            value: "Delivery / Drop Off",
            autoReason: "Most menu items are marked for drop-off service.",
        };
    }
    if (dominantLocation === "action_station") {
        return {
            value: "Action Station",
            autoReason: "Menu includes action station items.",
        };
    }
    if (dominantLocation === "finish_at_event") {
        return {
            value: "Full Service",
            autoReason: "Items require finishing on site.",
        };
    }
    if (dominantLocation === "finish_at_kitchen") {
        return {
            value: "Bring Hot",
            autoReason: "Items are finished in kitchen and brought hot.",
        };
    }
    return {
        value: "Full Service",
        autoReason: "Defaulted to full service based on mixed service types.",
    };
}
function detectPrepInstructions(event) {
    const items = event.menuSections || [];
    const withNotes = items
        .filter((item) => (item.preparationNotes && item.preparationNotes.length > 0) ||
        (item.specials && item.specials.length > 0))
        .map((item) => {
        const details = [item.preparationNotes, ...(item.specials || [])]
            .filter(Boolean)
            .join(" | ");
        return `${item.name}${details ? `: ${details}` : ""}`;
    });
    if (withNotes.length === 0) {
        return {
            value: "no",
            notes: "",
            autoReason: "No prep-specific notes detected in menu items.",
        };
    }
    return {
        value: "yes",
        notes: withNotes.slice(0, 4).join("\n"),
        autoReason: `Detected ${withNotes.length} menu item(s) with prep instructions to review.`,
    };
}
function detectEventLeadInstructions(event) {
    const unresolvedFlags = (event.flags || []).filter((flag) => !flag.resolved &&
        (flag.severity === "high" || flag.severity === "critical"));
    if (unresolvedFlags.length === 0) {
        return {
            value: "no",
            notes: "",
            autoReason: "No outstanding high-severity flags detected.",
        };
    }
    return {
        value: "yes",
        notes: unresolvedFlags
            .slice(0, 3)
            .map((flag) => flag.message)
            .join("\n"),
        autoReason: `Found ${unresolvedFlags.length} high severity issue(s) requiring lead awareness.`,
    };
}
function detectUnfamiliarItems(event) {
    const items = event.menuSections || [];
    const flagged = items.filter((item) => (item.warnings && item.warnings.length > 0) || /custom/i.test(item.name));
    if (flagged.length === 0) {
        return {
            value: "no",
            notes: "",
            autoReason: "No menu items flagged as unfamiliar or custom.",
        };
    }
    return {
        value: "yes",
        notes: flagged
            .slice(0, 5)
            .map((item) => item.name)
            .join("\n"),
        autoReason: `Identified ${flagged.length} item(s) flagged for review or marked as custom.`,
    };
}
function detectCustomMenuItems(event) {
    const customItems = (event.menuSections || []).filter((item) => /custom/i.test(item.name) || /custom/i.test(item.category));
    if (customItems.length === 0) {
        return {
            present: {
                value: "no",
                autoReason: "No custom menu items detected in menu sections.",
            },
            reviewed: {
                value: null,
                autoReason: "Requires confirmation from reviewer.",
            },
            questions: {
                value: "no",
                autoReason: "No custom items detected, defaulting to no questions.",
            },
        };
    }
    const summary = customItems.map((item) => item.name).join("\n");
    return {
        present: {
            value: "yes",
            notes: summary,
            autoReason: `Detected ${customItems.length} custom menu item(s).`,
        },
        reviewed: {
            value: null,
            notes: summary,
            autoReason: "Requires human confirmation that recipes were reviewed.",
        },
        questions: {
            value: "no",
            notes: "",
            autoReason: "No unanswered questions inferred automatically.",
        },
    };
}
function detectQuantityRecommendations(event) {
    const quantityFlags = (event.flags || []).filter((flag) => flag.code.startsWith("MENU_QTY"));
    const quantityWarnings = (event.menuSections || [])
        .flatMap((item) => item.warnings || [])
        .filter((warning) => /quantity|portion|serving/i.test(warning));
    if (quantityFlags.length === 0 && quantityWarnings.length === 0) {
        return {
            value: "no",
            notes: "",
            autoReason: "No quantity-related warnings detected.",
        };
    }
    const notes = [
        ...quantityFlags.map((flag) => flag.message),
        ...quantityWarnings,
    ].slice(0, 5);
    return {
        value: "yes",
        notes: notes.join("\n"),
        autoReason: "Detected quantity discrepancies in parsed data.",
    };
}
function detectCookedDifferently(event) {
    const keywords = [
        "fry",
        "grill",
        "mark",
        "sear",
        "finish",
        "bake on site",
        "heat",
    ];
    const hits = (event.menuSections || []).filter((item) => {
        const text = [item.preparationNotes || "", ...(item.specials || [])]
            .join(" ")
            .toLowerCase();
        return keywords.some((keyword) => text.includes(keyword));
    });
    if (hits.length === 0) {
        return {
            value: "no",
            notes: "",
            autoReason: "No on-site cooking instructions detected in menu notes.",
        };
    }
    return {
        value: "yes",
        notes: hits
            .slice(0, 5)
            .map((item) => item.name)
            .join("\n"),
        autoReason: `Detected ${hits.length} item(s) mentioning on-site cooking changes.`,
    };
}
function summarizeStaffing(event) {
    const staffing = event.staffing || [];
    if (staffing.length === 0) {
        return {
            lead: "",
            leadReason: "No staffing assignments detected for this event.",
            support: "",
            supportReason: "",
        };
    }
    const leadShift = staffing.find((shift) => /lead|chef/i.test(shift.position));
    const supportShifts = staffing.filter((shift) => shift !== leadShift);
    return {
        lead: leadShift ? leadShift.name : "",
        leadReason: leadShift
            ? `Auto-filled from staffing position: ${leadShift.position}.`
            : "",
        support: supportShifts
            .map((shift) => `${shift.name} (${shift.position})`)
            .join("\n"),
        supportReason: supportShifts.length > 0
            ? "Auto-listed support staff from schedule."
            : "",
    };
}
function detectPrepTiming(event) {
    const earlyPrepFlags = (event.flags || []).filter((flag) => /prep|schedule/i.test(flag.code) || /prep|schedule/i.test(flag.message));
    if (earlyPrepFlags.length === 0) {
        return {
            value: "no",
            notes: "",
            autoReason: "No prep scheduling flags detected.",
        };
    }
    return {
        value: "yes",
        notes: earlyPrepFlags.map((flag) => flag.message).join("\n"),
        autoReason: "Detected prep or schedule related issues in flags.",
    };
}
function detectTimelineAdjustments(event) {
    const timelineFlags = (event.flags || []).filter((flag) => /timeline|arrival|service/i.test(flag.code) ||
        /timeline|arrival|service/i.test(flag.message));
    if (timelineFlags.length === 0) {
        return {
            value: "No Change",
            notes: "",
            autoReason: "No timeline adjustments suggested by parsed data.",
        };
    }
    return {
        value: "More",
        notes: timelineFlags.map((flag) => flag.message).join("\n"),
        autoReason: "Timeline-related issues detected; consider additional time.",
    };
}
function detectEquipmentNeeds(event) {
    const kits = event.kits || [];
    const equipmentFlags = (event.flags || []).filter((flag) => /equipment|kit/i.test(flag.code) || /equipment|kit/i.test(flag.message));
    if (kits.length === 0 && equipmentFlags.length === 0) {
        return {
            value: null,
            autoReason: "Unable to determine equipment coverage automatically.",
            changes: "",
        };
    }
    if (equipmentFlags.length === 0) {
        return {
            value: "yes",
            notes: kits.join(", "),
            autoReason: "Equipment kits inferred from menu requirements.",
            changes: "",
        };
    }
    return {
        value: "no",
        notes: equipmentFlags.map((flag) => flag.message).join("\n"),
        autoReason: "Equipment-related warnings detected in parsed data.",
        changes: equipmentFlags.map((flag) => flag.message).join("\n"),
        changesReason: "Populate changes based on detected equipment issues.",
    };
}
function detectAdditionalQuestions(event) {
    const unresolved = (event.flags || []).filter((flag) => !flag.resolved);
    if (unresolved.length === 0) {
        return {
            value: "no",
            notes: "",
            autoReason: "No unresolved flags found in event data.",
        };
    }
    return {
        value: "yes",
        notes: unresolved
            .slice(0, 5)
            .map((flag) => flag.message)
            .join("\n"),
        autoReason: `There are ${unresolved.length} unresolved flag(s) that may require discussion.`,
    };
}
