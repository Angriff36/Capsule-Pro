import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { deleteFile, uploadFile } from "@repo/storage";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_UPLOAD = 5;

export async function POST(request: Request) {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const formData = await request.formData();
    const interactionId = formData.get("interactionId") as string | null;

    if (!interactionId) {
      return NextResponse.json(
        { message: "interactionId is required" },
        { status: 400 }
      );
    }

    const interaction = await database.clientInteraction.findFirst({
      where: { tenantId, id: interactionId, deletedAt: null },
    });

    if (!interaction) {
      return NextResponse.json(
        { message: "Interaction not found" },
        { status: 404 }
      );
    }

    const files = formData.getAll("files") as File[];
    if (!files || files.length === 0) {
      return NextResponse.json(
        { message: "No files provided" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { message: `Maximum ${MAX_FILES_PER_UPLOAD} files per upload` },
        { status: 400 }
      );
    }

    const attachments = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { message: `File type ${file.type} is not allowed` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { message: `File ${file.name} exceeds 10MB limit` },
          { status: 400 }
        );
      }

      const ext = file.name.split(".").pop() || "bin";
      const path = `interactions/${interactionId}/${crypto.randomUUID()}.${ext}`;

      const result = await uploadFile({
        tenantId,
        path,
        body: file,
        contentType: file.type,
      });

      const attachment = await database.interactionAttachment.create({
        data: {
          tenantId,
          interactionId,
          fileName: file.name,
          fileUrl: result.url,
          fileType: file.type,
          fileSize: file.size,
        },
      });

      attachments.push(attachment);
    }

    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error) {
    captureException(error);
    log.error("Error uploading attachments:", error);
    return NextResponse.json(
      { message: "Failed to upload attachments" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);
  const interactionId = searchParams.get("interactionId");

  if (!interactionId) {
    return NextResponse.json(
      { message: "interactionId is required" },
      { status: 400 }
    );
  }

  const attachments = await database.interactionAttachment.findMany({
    where: { tenantId, interactionId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ attachments });
}

export async function DELETE(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);
  const attachmentId = searchParams.get("attachmentId");

  if (!attachmentId) {
    return NextResponse.json(
      { message: "attachmentId is required" },
      { status: 400 }
    );
  }

  const attachment = await database.interactionAttachment.findFirst({
    where: { tenantId, id: attachmentId, deletedAt: null },
  });

  if (!attachment) {
    return NextResponse.json(
      { message: "Attachment not found" },
      { status: 404 }
    );
  }

  await deleteFile(attachment.fileUrl);
  await database.interactionAttachment.update({
    where: { tenantId_id: { tenantId, id: attachmentId } },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
