"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

function splitList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const seniorityValues = ["", "intern", "grad", "junior", "mid", "senior"] as const;

export async function savePreferences(formData: FormData) {
  const userId = await requireUserId();

  const targetRoles = splitList(formData.get("targetRoles"));
  const keywords = splitList(formData.get("keywords"));
  const fields = splitList(formData.get("fields"));
  const location = (formData.get("location") as string)?.trim() || null;
  const remoteOnly = formData.get("remoteOnly") === "on";
  const seniorityRaw = (formData.get("seniority") as string) ?? "";
  const seniority = seniorityValues.includes(seniorityRaw as never)
    ? seniorityRaw || null
    : null;
  const countryCode =
    ((formData.get("countryCode") as string) || "gb").toLowerCase().trim();
  const minMatchScore = z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .catch(0)
    .parse(formData.get("minMatchScore"));

  await prisma.preference.upsert({
    where: { userId },
    create: {
      userId,
      targetRoles,
      keywords,
      fields,
      location,
      remoteOnly,
      seniority,
      countryCode,
      minMatchScore,
    },
    update: {
      targetRoles,
      keywords,
      fields,
      location,
      remoteOnly,
      seniority,
      countryCode,
      minMatchScore,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Saved jobs
// ---------------------------------------------------------------------------

export async function toggleSaveJob(jobListingId: string) {
  const userId = await requireUserId();

  const existing = await prisma.savedJob.findUnique({
    where: { userId_jobListingId: { userId, jobListingId } },
  });

  if (existing) {
    await prisma.savedJob.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedJob.create({ data: { userId, jobListingId } });
  }

  revalidatePath("/");
  revalidatePath("/saved");
  return { saved: !existing };
}

// ---------------------------------------------------------------------------
// Manual fetch trigger (from the dashboard "Refresh jobs" button)
// ---------------------------------------------------------------------------

export async function triggerFetchForCurrentUser() {
  const userId = await requireUserId();

  const pref = await prisma.preference.findUnique({ where: { userId } });
  const { queriesFromPreferences, runJobFetch } = await import("@/lib/jobs");
  const { recomputeUserMatches } = await import("@/lib/matching");

  const queries = pref
    ? queriesFromPreferences(pref)
    : [{ what: "graduate software engineer", country: "gb", limit: 50 }];

  const result = await runJobFetch(queries);
  await recomputeUserMatches(userId, { onlyMissing: true });

  revalidatePath("/");
  return result;
}
