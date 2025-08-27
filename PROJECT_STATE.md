# EGC — Project State (Single Source of Truth)
_Last updated:_ 2025-08-27

---

## 0) Environment and Conventions
- OS: Windows 11
- Editor/Terminal: VS Code + PowerShell
- Repo: https://github.com/TheEsotericEel/egc.git
- Monorepo layout:
  - `apps/web` — Next.js (App Router, TS, Tailwind)
  - `apps/worker` — Node.js (TS) for jobs/OAuth
  - `packages/calc-core` — Pure TS math/types
- Terminals:
  - Terminal 1 (dev server): `npm run dev:web`
  - Terminal 2 (commands): git, npm, scaffolds

**Response rules for AI assistants**
- Always show path, purpose, required inputs, placeholders above code.
- Use `__REPLACE_ME::__` for unknowns and list them.
- PowerShell commands in fenced blocks with **no trailing newline**.
- When creating files: the same block must include `ni` and `code`. Create parent dirs if missing.
- Provide full file contents on edits.
- After steps: list completed checklist refs and offer `git add/commit/push`.

---

## 1) Project Overview
Two-tier tool for eBay sellers that estimates and tracks net income against goals.
- Free tier: CSV import + manual inputs.
- Paid tier: OAuth to eBay APIs for automated averages and reconciliation.
- Web app first, Chrome extension overlay later.

---

## 2) Progress Checklist (mirror of scope with checkboxes)

0. Scope and decisions
- [ ] 0-a
- [ ] 0-b
- [ ] 0-c
- [ ] 0-d
- [ ] 0-e
- [ ] 0-f
- [ ] 0-g

1. Monorepo bootstrap
- [x] 1-a (repo with web, worker, calc-core created)
- [x] 1-b (tooling: TS, ESLint, Prettier, Vitest, Playwright; web tsconfig updated with JSX/ESNext/interop; package.json patched)
- [x] 1-c (env schema validation + .env.example files)
- [ ] 1-d
- [ ] 1-e

2. Database (Neon Postgres)
- [x] 2-a (Neon project + DB `app` created)
- [x] 2-b (local connection verified with `pg` via `apps/worker/src/db/testConnection.ts` using `.env.local`)
- [ ] 2-c (schema + forward-only migrations)
- [ ] 2-d (seed script with demo user)
- [ ] 2-e
- [ ] 2-f

3. Security baseline
- [ ] 3-a
- [ ] 3-b
- [ ] 3-c
- [ ] 3-d

4. Auth and sessions
- [ ] 4-a
- [ ] 4-b
- [ ] 4-c

5. calc-core package
- [x] 5-a (types scaffolded; full InputBuckets, FeeBreakdown, Rollup, CalcOutput added)
- [x] 5-b (functions: gross, net, compute implemented; deterministic, covers fees/COGS/refunds)
- [ ] 5-c
- [ ] 5-d

6. CSV import (free tier)
- [ ] 6-a (mapping wizard UI with presets + validation on `/csv` — **not built yet; queued after DB schema**)
- [x] 6-b (Web Worker + Papa Parse streaming parse **fixed**; sends headers, chunked rows, progress; numeric coercion for `$`, `%`, commas, and `(123)` negatives)
- [x] 6-c (client-side rollups preview from streamed chunks; POST summarized rollups to `/api/rollups` route)
- [x] 6-d (first chart with Recharts — renders average per detected numeric column; determinate progress bar wired; errors surface; verified ≤2min p95)

7. Estimation dashboard
- [x] 7-a (inputs wired with Zustand store; SaleAmountsSection built)
- [ ] 7-b
- [~] 7-c (compute() pure and performant, not benchmarked yet)
- [x] 7-d (permanent “ESTIMATION” badge in CalculatorClient)

8. Billing and gating
- [ ] 8-a
- [ ] 8-b
- [ ] 8-c

9. Jobs layer and scheduling
- [ ] 9-a
- [ ] 9-b
- [ ] 9-c
- [ ] 9-d

10. eBay OAuth
- [ ] 10-a
- [ ] 10-b
- [ ] 10-c
- [ ] 10-d

11. Sync logic (paid)
- [ ] 11-a
- [ ] 11-b
- [ ] 11-c
- [ ] 11-d
- [ ] 11-e
- [ ] 11-f

12. Variance engine
- [ ] 12-a
- [ ] 12-b
- [ ] 12-c
- [ ] 12-d

13. Variance UI and export
- [ ] 13-a
- [ ] 13-b
- [ ] 13-c

14. Settings
- [ ] 14-a
- [ ] 14-b
- [ ] 14-c

15. Observability and operations
- [ ] 15-a
- [ ] 15-b
- [ ] 15-c
- [ ] 15-d

16. Performance gates
- [x] 16-a (CSV → first chart ≤ 2 min p95 verified with sample CSV)
- [ ] 16-b
- [ ] 16-c
- [ ] 16-d

17. Accuracy gates
- [ ] 17-a
- [ ] 17-b
- [ ] 17-c

18. Legal and eBay readiness
- [ ] 18-a
- [ ] 18-b
- [ ] 18-c

19. Deploy and config
- [ ] 19-a
- [ ] 19-b
- [ ] 19-c
- [ ] 19-d

20. E2E tests
- [ ] 20-a
- [ ] 20-b
- [ ] 20-c
- [ ] 20-d
- [ ] 20-e

21. Definition of Done (MVP)
- [ ] 21-a
- [ ] 21-b
- [ ] 21-c
- [ ] 21-d
- [ ] 21-e
- [ ] 21-f
- [ ] 21-g
- [ ] 21-h

22. Implementation phases
- [~] 22-a (partial)
  - *Done:* repo setup, calc-core types+functions, env validation, `.env.local` + Neon connection verified, **CSV worker fixed**, rollups POST, chart, determinate progress bar, `/api/rollups` route.
  - *Pending:* DB schema + migrations, mapping wizard.
- [~] 22-b (partial)
  - *Done:* calculatorStore (Zustand), SaleAmountsSection, CalculatorClient with tabs + rollup summary, permanent ESTIMATION badge.
  - *Pending:* remaining input sections, goal tracking, CSV variance integration.
- [ ] 22-c
- [ ] 22-d
- [ ] 22-e

---

## 3) Current Status (one-paragraph)
End-to-end CSV path works: Worker streams chunks with headers, progress %, and numeric coercion; client computes rollups and renders a Recharts bar chart (avg per numeric column). API route `/api/rollups` accepts summarized rollups and responds 200. UI shows determinate progress bar and error panel. Neon Postgres project is live and reachable via `apps/worker/.env.local` using `pg` and `testConnection.ts`. Chart semantics remain placeholder until 6-a mapping defines which columns are numeric vs identifiers.

---

## 4) Next Actions (actionable queue)
1) **DB schema & migrations (2-c)** — choose tool (Drizzle or Prisma), scaffold forward-only migrations for `users` and related tables; add seed script (2-d).  
2) **Mapping wizard (6-a)** — per-column mapping with presets; ignore IDs/emails/order numbers; flag numeric fields for aggregation.  
3) **Dashboard sections (7-b)** — Shipping, COGS, Fees, Ads, Payments; re-run `compute()` on change.  
4) **Chart controls** — allow Sum/Avg/Min/Max and column multi-select for clearer demos pre-6-a.  
5) **Rollups persistence** — wire POSTed rollups into DB once schema exists.

Owner: Joe
