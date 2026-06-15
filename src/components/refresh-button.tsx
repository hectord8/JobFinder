"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { triggerFetchForCurrentUser } from "@/app/actions";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onClick() {
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await triggerFetchForCurrentUser();
        setMsg(
          `Added ${res.inserted} new (${res.duplicatesSkipped} dupes skipped).`,
        );
        router.refresh();
      } catch {
        setMsg("Refresh failed — check provider API keys.");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-sm text-gray-500">{msg}</span>}
      <button onClick={onClick} disabled={isPending} className="btn-primary">
        {isPending ? "Fetching…" : "Refresh jobs"}
      </button>
    </div>
  );
}
