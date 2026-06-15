# JobFinder

A personal job-finder dashboard. Log in, upload your CV, set preferences, and
see jobs aggregated from multiple sources — each scored against your CV — with
links to apply and a Saved list.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · Prisma ·
PostgreSQL · NextAuth.js**.

## Features

- Email/password auth (NextAuth.js credentials + Prisma adapter)
- CV upload (PDF) → text extraction (`pdf-parse`) → stored for matching
- Pluggable file storage: local (dev), Supabase Storage, or Vercel Blob
- Job aggregation from Adzuna, Reed, Jooble, Arbeitnow, and JSearch (RapidAPI),
  with per-provider isolation, rate limiting, and cross-source deduplication
- CV→job match scoring (TF-IDF + cosine by default; swappable for OpenAI
  embeddings) with a "why it matched" skill breakdown
- Dashboard with sort-by-score, filters (source, location, min match %, remote,
  text search), Save button, and a Saved Jobs page
- Scheduled fetching via Vercel Cron, plus a manual "Refresh jobs" button

## Architecture

```
src/
  app/
    (app)/                 # authenticated area (shared nav layout)
      page.tsx             # dashboard
      saved/ settings/ cv/
    api/
      auth/[...nextauth]/  # NextAuth handler
      register/            # account creation
      cv/  cv/file/        # CV upload + serve
      cron/fetch-jobs/     # scheduled fetch + scoring (CRON_SECRET protected)
    actions.ts             # server actions (prefs, save, manual fetch)
    login/ register/       # public auth pages
  components/              # UI (job card, filters, nav, cv manager, …)
  lib/
    auth.ts prisma.ts env.ts storage.ts pdf.ts
    jobs/                  # provider abstraction + aggregator + dedup
      providers/           # adzuna, reed, jooble, arbeitnow, jsearch
    matching/              # Matcher interface, tfidf, embedding, orchestration
  middleware.ts            # route protection
prisma/schema.prisma       # data model
vercel.json                # cron schedule
```

The job providers all implement a common `JobProvider` interface and
self-disable when their API key is missing, so you can run with any subset of
sources. The matcher likewise implements a `Matcher` interface, making the
TF-IDF → embeddings swap a one-line config change.

## Setup

### 1. Install

```bash
npm install
```

### 2. Database (Supabase or Neon)

Create a PostgreSQL database, then copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` — pooled connection string
- `DIRECT_URL` — direct connection string (used by Prisma Migrate)

Push the schema and (optionally) seed a login:

```bash
npm run db:push
SEED_EMAIL=you@example.com SEED_PASSWORD=yourpassword npm run db:seed
```

Or just run the app and create an account at `/register`.

### 3. Auth

```bash
# .env
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

To restrict signups: set `ALLOW_REGISTRATION=false`, or
`REGISTRATION_ALLOWLIST="you@example.com"`.

### 4. CV storage

Pick a driver with `STORAGE_DRIVER`:

| Driver     | Setup                                                              |
| ---------- | ----------------------------------------------------------------- |
| `local`    | Default. Saves to `./uploads` (dev only).                         |
| `supabase` | `npm i @supabase/supabase-js`; set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, create a bucket (`SUPABASE_STORAGE_BUCKET`, default `cvs`). |
| `blob`     | `npm i @vercel/blob`; create a Blob store in Vercel (provides `BLOB_READ_WRITE_TOKEN`). |

### 5. Job provider API keys (all optional)

Add whichever you have; missing ones are skipped automatically.

| Provider  | Env vars                              | Where to get a key                                            |
| --------- | ------------------------------------- | ------------------------------------------------------------- |
| Adzuna    | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`     | https://developer.adzuna.com/                                 |
| Reed (UK) | `REED_API_KEY`                        | https://www.reed.co.uk/developers                             |
| Jooble    | `JOOBLE_API_KEY`                      | https://jooble.org/api/about                                  |
| JSearch   | `JSEARCH_RAPIDAPI_KEY`                | https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch        |
| Arbeitnow | _(none)_                              | Free, no key                                                  |

### 6. Matching

- Default: `MATCH_ALGORITHM=tfidf` (no external calls, runs locally).
- Embeddings: set `MATCH_ALGORITHM=embedding` and `OPENAI_API_KEY`.

### 7. Run

```bash
npm run dev
# http://localhost:3000
```

Log in, upload your CV (`/cv`), set preferences (`/settings`), then click
**Refresh jobs** on the dashboard.

## Scheduled fetching (Vercel Cron)

`vercel.json` runs `/api/cron/fetch-jobs` every 4 hours. Protect it by setting
`CRON_SECRET` in your Vercel project env — Vercel automatically sends it as
`Authorization: Bearer <CRON_SECRET>`.

Test it manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/fetch-jobs
```

The cron run: collects each user's preference-derived queries (deduped), runs
all enabled providers, dedups + inserts new listings, then computes match
scores for any jobs missing a score per user.

## Data model

`User` · `Account`/`Session`/`VerificationToken` (NextAuth) · `Cv`
(file ref + extracted text) · `Preference` · `JobListing` (deduped via
`fingerprint`) · `MatchScore` (per user/job) · `SavedJob`.

## Notes & cautions

- **Scraping**: This build uses official APIs only. A Playwright fallback can be
  added behind a feature flag in `src/lib/jobs/providers/` following the
  `JobProvider` interface — keep it rate-limited and easily disable-able.
- Free API tiers have rate/quota limits; the aggregator already adds delays
  between provider queries and isolates per-provider failures.
- The local storage driver is for development; use Supabase/Blob in production
  (serverless filesystems are ephemeral).
```
