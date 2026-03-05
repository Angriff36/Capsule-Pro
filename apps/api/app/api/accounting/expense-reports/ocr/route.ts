/**
 * POST /api/accounting/expense-reports/ocr
 *
 * Accepts a base64 image of a receipt and returns extracted data via OpenAI Vision.
 * Response: { vendorName, amount, date, category, confidence }
 */

import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageBase64, imageUrl } = body;

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        { message: "Either imageBase64 or imageUrl is required" },
        { status: 400 }
      );
    }

    const imageContent = imageBase64
      ? {
          type: "image_url" as const,
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
            detail: "high" as const,
          },
        }
      : {
          type: "image_url" as const,
          image_url: { url: imageUrl, detail: "high" as const },
        };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            imageContent,
            {
              type: "text",
              text: `Analyze this receipt image and extract the following information. Return ONLY a JSON object with these exact fields:
{
  "vendorName": "string — name of the business/vendor",
  "amount": number — total amount charged (final amount paid, in dollars),
  "date": "string — transaction date in ISO format YYYY-MM-DD, or null if not visible",
  "category": "string — one of: Meals & Entertainment, Travel, Transportation, Accommodation, Office Supplies, Equipment, Software, Marketing, Other",
  "confidence": number — 0-1 confidence score for the extraction,
  "notes": "string — any additional relevant info from the receipt (optional)"
}

Return ONLY the JSON. No explanation, no markdown code blocks.`,
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const rawText = response.choices[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from text
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = {};
        }
      }
    }

    return NextResponse.json({
      data: {
        vendorName: parsed.vendorName ?? "",
        amount: typeof parsed.amount === "number" ? parsed.amount : 0,
        date: parsed.date ?? null,
        category: parsed.category ?? "Other",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        notes: parsed.notes ?? "",
      },
    });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json(
      { message: "Failed to process receipt image" },
      { status: 500 }
    );
  }
}
