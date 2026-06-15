import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth";
import { extractPdfText } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cv = await prisma.cv.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      createdAt: true,
      extractedText: true,
    },
  });

  if (!cv) return NextResponse.json({ cv: null });

  return NextResponse.json({
    cv: {
      ...cv,
      // Only send a preview of the extracted text to the client.
      textPreview: cv.extractedText.slice(0, 1500),
      textLength: cv.extractedText.length,
      extractedText: undefined,
    },
  });
}

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are accepted." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 8 MB)." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let extractedText = "";
  try {
    extractedText = await extractPdfText(buffer);
  } catch {
    return NextResponse.json(
      { error: "Could not read text from this PDF." },
      { status: 422 },
    );
  }
  if (extractedText.length < 30) {
    return NextResponse.json(
      {
        error:
          "Extracted almost no text — is this a scanned/image-only PDF? Try a text-based PDF.",
      },
      { status: 422 },
    );
  }

  const storage = getStorage();
  const key = `${userId}/${randomUUID()}.pdf`;
  const stored = await storage.upload(key, buffer, "application/pdf");

  // Deactivate previous CVs, store the new active one.
  const cv = await prisma.$transaction(async (tx) => {
    await tx.cv.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    return tx.cv.create({
      data: {
        userId,
        fileName: file.name,
        storageKey: stored.storageKey,
        fileUrl: stored.url,
        extractedText,
        isActive: true,
      },
      select: { id: true, fileName: true, fileUrl: true, createdAt: true },
    });
  });

  // Recompute match scores against the new CV (best-effort, non-blocking).
  void recomputeMatchesSafe(userId);

  return NextResponse.json({ cv, textLength: extractedText.length });
}

async function recomputeMatchesSafe(userId: string) {
  try {
    const { recomputeUserMatches } = await import("@/lib/matching");
    await recomputeUserMatches(userId);
  } catch (err) {
    console.error("Match recompute failed:", err);
  }
}
