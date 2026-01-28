/**
 * @module DocumentParseAPI
 * @intent Parse uploaded PDFs and CSVs to extract event data
 * @responsibility Handle document upload, parsing, and data extraction
 * @domain Events
 * @tags events, documents, parsing, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type {
  BattleBoardBuildResult,
  ChecklistBuildResult,
  ProcessedDocument,
} from "@repo/event-parser";
import {
  buildBattleBoardFromEvent,
  buildInitialChecklist,
  processMultipleDocuments,
} from "@repo/event-parser";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * POST /api/events/documents/parse
 * Upload and parse document(s) for event data extraction
 *
 * Accepts multipart/form-data with files
 * Query params:
 *   - eventId: Optional - link to existing event
 *   - generateChecklist: boolean - auto-fill Pre-Event Review
 *   - generateBattleBoard: boolean - auto-fill Battle Board
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const eventId = searchParams.get("eventId");
    const generateChecklist = searchParams.get("generateChecklist") === "true";
    const generateBattleBoard =
      searchParams.get("generateBattleBoard") === "true";

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { message: "No files uploaded" },
        { status: 400 }
      );
    }

    // Validate file types
    const allowedExtensions = [".pdf", ".csv"];

    for (const file of files) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!allowedExtensions.includes(ext)) {
        return NextResponse.json(
          {
            message: `Invalid file type: ${file.name}. Only PDF and CSV files are allowed.`,
          },
          { status: 400 }
        );
      }
    }

    // Process files
    const fileContents = await Promise.all(
      files.map(async (file) => ({
        content: await file.arrayBuffer(),
        fileName: file.name,
      }))
    );

    // Parse documents
    const result = await processMultipleDocuments(fileContents);

    // Store processed documents and create import records
    const importRecords = await Promise.all(
      files.map(async (file, index) => {
        const doc = result.documents[index];

        // Determine MIME type
        const ext = file.name.split(".").pop()?.toLowerCase();
        const mimeType =
          ext === "pdf" ? "application/pdf" : ext === "csv" ? "text/csv" : "";

        // Create import record matching EventImport schema
        const importRecord = await database.eventImport.create({
          data: {
            tenantId,
            fileName: file.name,
            mimeType,
            fileSize: file.size,
            fileType: doc.fileType,
            detectedFormat: doc.detectedFormat,
            parseStatus: doc.errors.length > 0 ? "failed" : "parsed",
            parseErrors: doc.errors,
            confidence: doc.confidence,
            extractedData: JSON.parse(
              JSON.stringify({
                event: doc.parsedEvent?.event || null,
                staff: doc.staffShifts
                  ? Object.fromEntries(doc.staffShifts)
                  : null,
                warnings: doc.warnings,
              })
            ),
            eventId: eventId || undefined,
            parsedAt: new Date(),
          },
        });

        return {
          importId: importRecord.id,
          document: doc,
        };
      })
    );

    // Build response
    const response: {
      documents: ProcessedDocument[];
      mergedEvent: typeof result.mergedEvent;
      mergedStaff: typeof result.mergedStaff;
      imports: typeof importRecords;
      checklist?: ChecklistBuildResult;
      checklistId?: string;
      battleBoard?: BattleBoardBuildResult;
      battleBoardId?: string;
      errors: string[];
    } = {
      documents: result.documents,
      mergedEvent: result.mergedEvent,
      mergedStaff: result.mergedStaff,
      imports: importRecords,
      errors: result.errors,
    };

    // Generate and save battle board if requested and we have event data
    if (generateBattleBoard && result.mergedEvent) {
      const battleBoardResult = buildBattleBoardFromEvent(result.mergedEvent);
      response.battleBoard = battleBoardResult;

      // Save battle board to database
      const boardName =
        result.mergedEvent.client ||
        result.mergedEvent.number ||
        `Import ${new Date().toISOString().slice(0, 10)}`;

      const savedBattleBoard = await database.battleBoard.create({
        data: {
          tenantId,
          board_name: boardName,
          board_type: "event-specific",
          schema_version: "mangia-battle-board@1",
          boardData: battleBoardResult.battleBoard as object,
          status: "draft",
          is_template: false,
          tags: ["imported"],
          eventId: eventId || undefined,
        },
      });

      response.battleBoardId = savedBattleBoard.id;

      // Update import records with battle board reference
      for (const record of importRecords) {
        await database.eventImport.update({
          where: { id: record.importId },
          data: { battleBoardId: savedBattleBoard.id },
        });
      }
    }

    // Generate and save checklist if requested and we have event data
    if (generateChecklist && result.mergedEvent) {
      const checklistResult = buildInitialChecklist(result.mergedEvent);
      response.checklist = checklistResult;

      // For checklist, we need an eventId - create an event if needed
      let targetEventId = eventId;

      if (!targetEventId) {
        // Create a new event from the parsed data
        const newEvent = await database.event.create({
          data: {
            tenantId,
            title:
              result.mergedEvent.client ||
              `Imported Event ${new Date().toISOString().slice(0, 10)}`,
            eventType: result.mergedEvent.serviceStyle || "catering",
            eventDate: result.mergedEvent.date
              ? new Date(result.mergedEvent.date)
              : new Date(),
            guestCount: result.mergedEvent.headCount || 0,
            status: "confirmed",
            eventNumber: result.mergedEvent.number || undefined,
            venueName: result.mergedEvent.venue?.name || undefined,
            venueAddress: result.mergedEvent.venue?.address || undefined,
            notes: `Imported from ${files.map((f) => f.name).join(", ")}`,
            tags: ["imported"],
          },
        });
        targetEventId = newEvent.id;

        // Update import records with event reference
        for (const record of importRecords) {
          await database.eventImport.update({
            where: { id: record.importId },
            data: { eventId: targetEventId },
          });
        }

        // Also update battle board if created
        if (response.battleBoardId) {
          await database.battleBoard.update({
            where: { id: response.battleBoardId },
            data: { eventId: targetEventId },
          });
        }
      }

      // Now save the checklist/report
      const savedReport = await database.eventReport.create({
        data: {
          tenantId,
          eventId: targetEventId,
          version: new Date().toISOString().slice(0, 10),
          status: "draft",
          completion: Math.round(
            (checklistResult.autoFilledCount / checklistResult.totalQuestions) *
              100
          ),
          checklistData: checklistResult.checklist as object,
          parsedEventData: result.mergedEvent as object,
          autoFillScore: checklistResult.autoFilledCount,
          reviewNotes: checklistResult.warnings.length > 0
            ? `Auto-fill warnings: ${checklistResult.warnings.join("; ")}`
            : undefined,
        },
      });

      response.checklistId = savedReport.id;

      // Update import records with report reference
      for (const record of importRecords) {
        await database.eventImport.update({
          where: { id: record.importId },
          data: { reportId: savedReport.id },
        });
      }
    }

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("Error parsing documents:", error);

    // Provide more detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // In development, return more details; in production, return generic message
    return NextResponse.json(
      {
        message: "Failed to parse documents",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        ...(process.env.NODE_ENV === "development" && errorStack ? { stack: errorStack } : {}),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/documents/parse
 * Get list of recent import records
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
      100
    );
    const offset = (page - 1) * limit;

    const imports = await database.eventImport.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await database.eventImport.count({
      where: {
        tenantId,
        deletedAt: null,
      },
    });

    return NextResponse.json({
      data: imports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing imports:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
