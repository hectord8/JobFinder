import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { queriesFromPreferences, runJobFetch } from "@/lib/jobs";
import { recomputeAllUsersMatches } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

// This can run longer than the default; Vercel Hobby caps at 60s, Pro higher.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Scheduled job-fetch + match-score update.
 *
 * Triggered by Vercel Cron (see vercel.json). Vercel sends
 *   Authorization: Bearer <CRON_SECRET>
 * Also runnable manually with the same header for testing.
 */
async function handle(req: Request): Promise<NextResponse> {
  if (env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Gather queries from every user's preferences, deduped, so providers run
  // once per distinct query rather than once per user.
  const prefs = await prisma.preference.findMany();
  const queryMap = new Map<string, ReturnType<typeof queriesFromPreferences>[number]>();
  for (const pref of prefs) {
    for (const q of queriesFromPreferences(pref)) {
      queryMap.set(`${q.what}|${q.where ?? ""}|${q.country}|${q.remoteOnly}`, q);
    }
  }
  // Sensible default so a brand-new install still pulls something in.
  if (queryMap.size === 0) {
    queryMap.set("default", {
      what: "graduate software engineer",
      country: "gb",
      limit: 50,
    });
  }

  const fetchResult = await runJobFetch([...queryMap.values()]);

  // Score only the jobs that don't yet have a per-user score.
  await recomputeAllUsersMatches({ onlyMissing: true });

  return NextResponse.json({
    ok: true,
    queries: queryMap.size,
    ...fetchResult,
    ranAt: new Date().toISOString(),
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
