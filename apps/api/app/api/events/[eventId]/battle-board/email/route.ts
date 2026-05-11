import { auth } from "@repo/auth/server";
import { resend } from "@repo/email";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";

type RouteParams = Promise<{
  eventId: string;
}>;

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { eventId } = await params;
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipients, eventName } = body as {
      recipients: string[];
      eventName: string;
    };

    if (!recipients?.length) {
      return NextResponse.json(
        { error: "At least one recipient is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter((e: string) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid email addresses: ${invalidEmails.join(", ")}` },
        { status: 400 }
      );
    }

    // Generate the PDF by calling the existing PDF endpoint internally
    const pdfUrl = new URL(
      `/api/events/${eventId}/battle-board/pdf?download=true`,
      request.url
    );

    const pdfResponse = await fetch(pdfUrl.toString(), {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: "Failed to generate PDF" },
        { status: 500 }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const sanitizedEventName = eventName || "Battle Board";

    await resend.emails.send({
      from: "Capsule Pro <noreply@capsulepro.app>",
      to: recipients,
      subject: `Battle Board: ${sanitizedEventName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a4d2e;">Battle Board — ${sanitizedEventName}</h2>
          <p>Please find the Battle Board PDF attached for the event <strong>${sanitizedEventName}</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Sent via Capsule Pro</p>
        </div>
      `,
      attachments: [
        {
          filename: `battle-board-${sanitizedEventName.replaceAll(/\s+/g, "-").toLowerCase()}.pdf`,
          content: Buffer.from(pdfBuffer).toString("base64"),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      sent: recipients.length,
    });
  } catch (error) {
    log.error("Error emailing battle board PDF:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
