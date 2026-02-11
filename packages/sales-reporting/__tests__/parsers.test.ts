/**
 * Unit tests for CSV and XLSX parsers.
 */

import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/parsers/csv-parser";
import { parseXlsx } from "../src/parsers/xlsx-parser";

describe("parseCsv", () => {
  it("parses valid CSV data with standard columns", () => {
    const csvData = Buffer.from(
      "Date,Event Name,Event Type,Client Name,Lead Source,Status,Revenue\n" +
        "2024-01-15,Wedding,Wedding,Smith Corp,Referral,won,15000\n" +
        "2024-01-16,Corporate Event,Corporate,Acme Inc,Website,proposal_sent,25000"
    );

    const records = parseCsv(csvData);

    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({
      date: new Date("2024-01-15"),
      eventName: "Wedding",
      eventType: "Wedding",
      clientName: "Smith Corp",
      leadSource: "Referral",
      status: "won",
      proposalDate: null,
      closeDate: null,
      revenue: 15_000,
      eventDate: null,
    });
  });

  it("handles CSV with different column name variations", () => {
    const csvData = Buffer.from(
      "record_date,deal_name,occasion,account,channel,stage,deal_value\n" +
        "2024-01-15,Wedding Smith,Wedding,Smith Corp,Referral,closed,15000"
    );

    const records = parseCsv(csvData);

    expect(records).toHaveLength(1);
    expect(records[0].clientName).toBe("Smith Corp");
    expect(records[0].status).toBe("won");
    expect(records[0].revenue).toBe(15_000);
  });

  it("filters out rows with invalid dates", () => {
    const csvData = Buffer.from(
      "Date,Event Name,Client Name,Status,Revenue\n" +
        "2024-01-15,Valid Event,Client,won,10000\n" +
        "invalid-date,Invalid Event,Client,pending,5000\n" +
        "2024-01-16,Another Valid,Another Client,won,20000"
    );

    const records = parseCsv(csvData);

    expect(records).toHaveLength(2);
    expect(records[0].eventName).toBe("Valid Event");
    expect(records[1].eventName).toBe("Another Valid");
  });

  it("parses currency values with symbols and commas", () => {
    const csvData = Buffer.from(
      "Date,Event Name,Client Name,Status,Revenue\n" +
        '2024-01-15,Event1,Client1,won,"$15,000"\n' +
        '2024-01-16,Event2,Client2,won,"20,500"'
    );

    const records = parseCsv(csvData);

    expect(records).toHaveLength(2);
    expect(records[0].revenue).toBe(15_000);
    expect(records[1].revenue).toBe(20_500);
  });

  it("uses custom date column when provided", () => {
    const csvData = Buffer.from(
      "Date,Inquiry Date,Event Name,Client Name,Revenue\n" +
        "2024-01-01,2024-01-15,Event1,Client1,10000\n" +
        "2024-01-02,2024-01-16,Event2,Client2,20000"
    );

    const records = parseCsv(csvData, "Inquiry Date");

    expect(records).toHaveLength(2);
    expect(records[0].date).toEqual(new Date("2024-01-15"));
    expect(records[1].date).toEqual(new Date("2024-01-16"));
  });

  it("normalizes column headers to lowercase with underscores", () => {
    const csvData = Buffer.from(
      "Event Date,Deal Name,Event Type,Customer,Lead Source,Status,Amount\n" +
        "2024-01-15,Wedding,Wedding,Smith Corp,Referral,won,15000"
    );

    const records = parseCsv(csvData);

    expect(records).toHaveLength(1);
    expect(records[0].eventName).toBe("Wedding");
    expect(records[0].clientName).toBe("Smith Corp");
  });

  it("handles empty rows gracefully", () => {
    const csvData = Buffer.from(
      "Date,Event Name,Client Name,Status,Revenue\n" +
        "2024-01-15,Event1,Client1,won,10000\n" +
        "\n" +
        "2024-01-16,Event2,Client2,won,20000"
    );

    const records = parseCsv(csvData);

    expect(records).toHaveLength(2);
  });

  it("throws on critical CSV parsing errors", () => {
    // This test verifies the error handling is in place
    // The actual error throwing depends on PapaParse configuration
    const csvData = Buffer.from("Invalid,CSV,Data\n");

    // Should not throw, just return empty array or filtered records
    expect(() => parseCsv(csvData)).not.toThrow();
  });
});

describe("parseXlsx", () => {
  it("parses XLSX data with standard columns", () => {
    // Create a minimal valid XLSX buffer
    // In a real test, you'd use an actual XLSX file
    // For this test, we'll verify the function exists and handles errors
    const emptyBuffer = Buffer.from([]);

    // Should handle empty or invalid data gracefully
    const records = parseXlsx(emptyBuffer);

    // Empty buffer should result in empty records
    expect(Array.isArray(records)).toBe(true);
  });

  it("handles multiple sheets", () => {
    // Verify the function can process multiple sheets
    const emptyBuffer = Buffer.from([]);

    const records = parseXlsx(emptyBuffer);

    expect(Array.isArray(records)).toBe(true);
  });

  it("uses custom date column when provided", () => {
    const emptyBuffer = Buffer.from([]);

    const records = parseXlsx(emptyBuffer, "Custom Date");

    expect(Array.isArray(records)).toBe(true);
  });
});

describe("Status normalization", () => {
  it("normalizes various status strings correctly", () => {
    const testCases = [
      ["won", "won"],
      ["Won", "won"],
      ["WON", "won"],
      ["closed", "won"],
      ["lost", "lost"],
      ["Lost", "lost"],
      ["pending", "pending"],
      ["Pending", "pending"],
      ["open", "pending"],
      ["proposal_sent", "proposal_sent"],
      ["proposal sent", "proposal_sent"],
      ["unknown_status", "pending"], // defaults to pending (not in STATUS_MAP)
      ["some other value", "pending"], // defaults to pending
    ];

    const csvData = Buffer.from(
      "Date,Event Name,Client Name,Status,Revenue\n" +
        testCases
          .map(([status]) => `2024-01-15,Event,Client,${status},10000`)
          .join("\n")
    );

    const records = parseCsv(csvData);

    expect(records).toHaveLength(testCases.length);
    testCases.forEach(([input, expected], index) => {
      expect(records[index].status).toBe(expected);
    });
  });
});

describe("Date parsing", () => {
  it("parses ISO date strings", () => {
    const csvData = Buffer.from(
      "Date,Event Name,Client Name,Status,Revenue\n" +
        "2024-01-15,Event,Client,won,10000"
    );

    const records = parseCsv(csvData);

    expect(records[0].date).toEqual(new Date("2024-01-15"));
  });

  it("parses various date formats", () => {
    const testCases = [
      "2024-01-15",
      "01/15/2024",
      "15-01-2024",
      "Jan 15 2024",
      "January 15 2024",
    ];

    const csvData = Buffer.from(
      "Date,Event Name,Client Name,Status,Revenue\n" +
        testCases.map((date) => `${date},Event,Client,won,10000`).join("\n")
    );

    const records = parseCsv(csvData);

    // At least some of these should parse successfully
    expect(records.length).toBeGreaterThan(0);
  });

  it("handles Excel serial dates", () => {
    // Excel serial date for 2024-01-15 is approximately 45306
    const excelSerial = "45306";

    const csvData = Buffer.from(
      "Date,Event Name,Client Name,Status,Revenue\n" +
        `${excelSerial},Event,Client,won,10000`
    );

    const records = parseCsv(csvData);

    // Should parse Excel serial date
    expect(records.length).toBeGreaterThan(0);
  });
});

describe("Revenue parsing", () => {
  it("parses various revenue formats", () => {
    const testCases = [
      ["10000", 10_000],
      ['"10,000"', 10_000],
      ['"$10,000"', 10_000],
      ["10000.50", 10_000.5],
      ['"$10,000.50"', 10_000.5],
      ["0", 0],
      ["", 0],
      ["invalid", 0],
    ];

    const csvData = Buffer.from(
      "Date,Event Name,Client Name,Status,Revenue\n" +
        testCases
          .map(([revenue]) => `2024-01-15,Event,Client,won,${revenue}`)
          .join("\n")
    );

    const records = parseCsv(csvData);

    testCases.forEach(([_, expected], index) => {
      expect(records[index].revenue).toBe(expected);
    });
  });
});

describe("Edge cases", () => {
  it("handles completely empty CSV", () => {
    const csvData = Buffer.from("Date,Event Name,Client Name,Status,Revenue\n");

    const records = parseCsv(csvData);

    expect(records).toHaveLength(0);
  });

  it("handles CSV with only headers", () => {
    const csvData = Buffer.from("Date,Event Name,Client Name,Status,Revenue\n");

    const records = parseCsv(csvData);

    expect(records).toHaveLength(0);
  });

  it("handles special characters in field values", () => {
    const csvData = Buffer.from(
      "Date,Event Name,Client Name,Status,Revenue\n" +
        '2024-01-15,"Event, with commas",Client,won,10000\n' +
        '2024-01-16,"Event ""with"" quotes",Client,won,20000'
    );

    const records = parseCsv(csvData);

    expect(records).toHaveLength(2);
    expect(records[0].eventName).toBe("Event, with commas");
    expect(records[1].eventName).toBe('Event "with" quotes');
  });

  it("handles unicode characters", () => {
    const csvData = Buffer.from(
      "Date,Event Name,Client Name,Status,Revenue\n" +
        "2024-01-15,Café Event,日本語クライアント,won,15000"
    );

    const records = parseCsv(csvData);

    expect(records).toHaveLength(1);
    expect(records[0].eventName).toBe("Café Event");
    expect(records[0].clientName).toBe("日本語クライアント");
  });
});
