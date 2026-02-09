"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRowToRecord = parseRowToRecord;
const STATUS_MAP = {
    won: "won",
    closed: "won",
    "closed won": "won",
    lost: "lost",
    "closed lost": "lost",
    pending: "pending",
    open: "pending",
    proposal_sent: "proposal_sent",
    "proposal sent": "proposal_sent",
    proposed: "proposal_sent",
};
function parseDate(value) {
    if (!value || value.trim() === "")
        return null;
    const trimmed = value.trim();
    const d = new Date(trimmed);
    if (!isNaN(d.getTime()))
        return d;
    // Try Excel serial date format
    const num = Number.parseFloat(trimmed);
    if (!isNaN(num) && num > 0) {
        const epoch = Math.round((num - 25569) * 86400 * 1000);
        const excelDate = new Date(epoch);
        if (!isNaN(excelDate.getTime()))
            return excelDate;
    }
    return null;
}
function parseNumber(value) {
    if (!value)
        return 0;
    const cleaned = value.replace(/[$,\s]/g, "");
    const num = Number.parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}
function normalizeStatus(raw) {
    const normalized = raw
        .trim()
        .toLowerCase()
        .replace(/[-\s]+/g, "_");
    return STATUS_MAP[normalized] ?? "pending";
}
// Fuzzy column name matching - finds the best matching column for a given field
function findColumn(row, candidates) {
    for (const candidate of candidates) {
        // Direct match
        if (row[candidate])
            return candidate;
        // Case-insensitive match
        const lowerKey = candidate.toLowerCase();
        for (const key of Object.keys(row)) {
            if (key.toLowerCase() === lowerKey)
                return key;
        }
    }
    return undefined;
}
function parseRowToRecord(row, dateColumn) {
    // Find date column - use provided one or search for it
    let dateStr;
    if (dateColumn) {
        const normalizedDateColumn = dateColumn.toLowerCase().replace(/\s+/g, "_");
        dateStr =
            row[normalizedDateColumn] ||
                row[dateColumn.toLowerCase()] ||
                row[dateColumn];
    }
    // If no date found yet, search for any column that looks like a date
    if (!dateStr) {
        const dateCol = findColumn(row, [
            "date",
            "Date",
            "DATE",
            "created_date",
            "Created Date",
            "Created_Date",
            "event_date",
            "Event Date",
            "Event_Date",
            "record_date",
            "Record Date",
            "Record_Date",
            "entry_date",
            "Entry Date",
            "Entry_Date",
            "inquiry_date",
            "Inquiry Date",
            "Inquiry_Date",
            "lead_date",
            "Lead Date",
            "Lead_Date",
            "start_date",
            "Start Date",
            "Start_Date",
        ]);
        if (dateCol)
            dateStr = row[dateCol];
    }
    // Last resort: try to find any column with "date" in the name
    if (!dateStr) {
        for (const [key, value] of Object.entries(row)) {
            if (key.toLowerCase().includes("date") && value) {
                const parsed = parseDate(value);
                if (parsed) {
                    dateStr = value;
                    break;
                }
            }
        }
    }
    const date = parseDate(dateStr);
    if (!date)
        return null;
    // Extract other fields with flexible matching
    const eventCol = findColumn(row, [
        "event_name",
        "Event Name",
        "Event_Name",
        "deal_name",
        "Deal Name",
        "Deal_Name",
        "opportunity",
        "Opportunity",
        "event",
        "Event",
        "deal",
        "Deal",
        "name",
        "Name",
    ]);
    const typeCol = findColumn(row, [
        "event_type",
        "Event Type",
        "Event_Type",
        "type",
        "Type",
        "category",
        "Category",
        "event_category",
        "Event Category",
        "occasion",
        "Occasion",
    ]);
    const clientCol = findColumn(row, [
        "client_name",
        "Client Name",
        "Client_Name",
        "customer",
        "Customer",
        "client",
        "Client",
        "company",
        "Company",
        "organization",
        "Organization",
        "account",
        "Account",
        "contact_company_name",
        "Contact Company Name",
        "contact_first_name",
        "Contact First Name",
        "contact_last_name",
        "Contact Last Name",
    ]);
    const sourceCol = findColumn(row, [
        "lead_source",
        "Lead Source",
        "Lead_Source",
        "source",
        "Source",
        "channel",
        "Channel",
        "referral",
        "Referral",
        "referred_from",
        "Referred From",
    ]);
    const statusCol = findColumn(row, [
        "status",
        "Status",
        "deal_status",
        "Deal Status",
        "stage",
        "Stage",
        "state",
        "State",
        "event_status",
        "Event Status",
    ]);
    const proposalDateCol = findColumn(row, [
        "proposal_date",
        "Proposal Date",
        "proposed_date",
        "Proposed Date",
        "quote_date",
        "Quote Date",
    ]);
    const closeDateCol = findColumn(row, [
        "close_date",
        "Close Date",
        "closed_date",
        "Closed Date",
        "won_date",
        "Won Date",
        "lost_date",
        "Lost Date",
    ]);
    const revenueCol = findColumn(row, [
        "revenue",
        "Revenue",
        "amount",
        "Amount",
        "value",
        "Value",
        "deal_value",
        "Deal Value",
        "price",
        "Price",
        "total",
        "Total",
        "cost",
        "Cost",
        "event_total",
        "Event Total",
    ]);
    const eventDateCol = findColumn(row, [
        "event_date",
        "Event Date",
        "delivery_date",
        "Delivery Date",
        "booking_date",
        "Booking Date",
        "event_date_time",
        "Event Date Time",
    ]);
    return {
        date,
        eventName: eventCol ? row[eventCol] : "",
        eventType: typeCol ? row[typeCol] : "",
        clientName: clientCol ? row[clientCol] : "",
        leadSource: sourceCol ? row[sourceCol] : "",
        status: statusCol ? normalizeStatus(row[statusCol]) : "pending",
        proposalDate: proposalDateCol ? parseDate(row[proposalDateCol]) : null,
        closeDate: closeDateCol ? parseDate(row[closeDateCol]) : null,
        revenue: revenueCol ? parseNumber(row[revenueCol]) : 0,
        eventDate: eventDateCol ? parseDate(row[eventDateCol]) : null,
    };
}
//# sourceMappingURL=row-mapper.js.map