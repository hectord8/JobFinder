import { CvManager } from "@/components/cv-manager";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CvPage() {
  const userId = await requireUserId();
  const cv = await prisma.cv.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      fileName: true,
      fileUrl: true,
      createdAt: true,
      extractedText: true,
    },
  });

  const initial = cv
    ? {
        fileName: cv.fileName,
        fileUrl: cv.fileUrl,
        createdAt: cv.createdAt.toISOString(),
        textPreview: cv.extractedText.slice(0, 2000),
        textLength: cv.extractedText.length,
      }
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your CV</h1>
        <p className="text-sm text-gray-500">
          Upload a text-based PDF. We extract the text and re-score all jobs
          against it.
        </p>
      </div>
      <CvManager initial={initial} />
    </div>
  );
}
