import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readLocalFile } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Serves the active CV PDF for the signed-in user. Used by the local storage
 * driver (cloud drivers expose a direct fileUrl instead).
 */
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
  });
  if (!cv) return NextResponse.json({ error: "No CV" }, { status: 404 });

  if (cv.fileUrl) {
    return NextResponse.redirect(cv.fileUrl);
  }

  try {
    const data = await readLocalFile(cv.storageKey);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${cv.fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
