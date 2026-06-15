"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function JobFilters({
  sources,
  defaultMinMatch,
}: {
  sources: string[];
  defaultMinMatch: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`/?${next.toString()}`);
    },
    [params, router],
  );

  return (
    <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label className="label">Search</label>
        <input
          className="input"
          defaultValue={params.get("q") ?? ""}
          placeholder="title or company"
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value);
          }}
          onBlur={(e) => setParam("q", e.target.value)}
        />
      </div>
      <div>
        <label className="label">Source</label>
        <select
          className="input"
          defaultValue={params.get("source") ?? ""}
          onChange={(e) => setParam("source", e.target.value)}
        >
          <option value="">All</option>
          {sources.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Location</label>
        <input
          className="input"
          defaultValue={params.get("location") ?? ""}
          placeholder="e.g. London"
          onBlur={(e) => setParam("location", e.target.value)}
        />
      </div>
      <div>
        <label className="label">Min match %</label>
        <input
          type="number"
          min={0}
          max={100}
          className="input"
          defaultValue={defaultMinMatch || ""}
          onBlur={(e) => setParam("minMatch", e.target.value)}
        />
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={params.get("remote") === "1"}
            onChange={(e) => setParam("remote", e.target.checked ? "1" : "")}
          />
          Remote only
        </label>
      </div>
    </div>
  );
}
