import { describe, expect, it } from "vitest";
import { utils, type WorkBook } from "xlsx";
import { loadSalesData } from "../../../app/(authenticated)/analytics/sales/lib/sales-analytics";

const buildWorkbook = (
  sheets: Array<{ name: string; rows: Record<string, unknown>[] }>
): WorkBook => {
  const workbook = utils.book_new();
  for (const sheet of sheets) {
    utils.book_append_sheet(
      workbook,
      utils.json_to_sheet(sheet.rows.length ? sheet.rows : [{ empty: null }]),
      sheet.name
    );
  }
  return workbook;
};

describe("loadSalesData", () => {
  it("parses data from arbitrary worksheet names without requiring canonical tabs", async () => {
    const workbook = buildWorkbook([
      {
        name: "Events Export",
        rows: [
          {
            "Event Date": "2025-01-15",
            "Created On": "2024-12-20",
            Status: "Won",
            Revenue: "10000",
            "Event Type": "Wedding",
          },
        ],
      },
      {
        name: "Lost Reasons",
        rows: [{ Reason: "Budget", Count: 2 }],
      },
      {
        name: "Lead Channels",
        rows: [{ Source: "Google", Count: 5 }],
      },
    ]);

    const data = await loadSalesData(workbook);

    expect(data.masterEvents).toHaveLength(1);
    expect(data.dealsLost).toHaveLength(1);
    expect(data.leadSource).toHaveLength(1);
    expect(data.rawSheets["Events Export"]).toHaveLength(1);
  });
});
