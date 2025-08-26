# EGC — Project State (Single Source of Truth)

_Last updated:_ 2025-08-26

This file is the entrypoint for any AI reading this GitHub repo. It summarizes environment, rules, scope, progress, and next actions. Update this file after every commit that advances scope.

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
- Use `__REPLACE_ME::<KEY>__` for unknowns and list them.
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
- [x] 1-a  (repo with web, worker, calc-core created)
- [x] 1-b  (tooling: TS, ESLint, Prettier, Vitest, Playwright)
- [x] 1-c  (env schema validation + .env.example files)
- [ ] 1-d
- [ ] 1-e

2. Database (Neon Postgres)
- [ ] 2-a
- [ ] 2-b
- [ ] 2-c
- [ ] 2-d
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
- [x] 5-a (types scaffolded)
- [x] 5-b (functions: gross, fees, net; used in web demo)
- [ ] 5-c
- [ ] 5-d

6. CSV import (free tier)
- [~] 6-a (partial)  
  *Done:* `/csv` route, Web Worker parsing, preview table.  
  *Pending:* mapping wizard UI + presets.  
- [x] 6-b (Web Worker + Papa Parse streaming parse, progress UI)
- [ ] 6-c
- [ ] 6-d

7. Estimation dashboard
- [ ] 7-a
- [ ] 7-b
- [ ] 7-c
- [ ] 7-d

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
- [ ] 16-a
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
  *Done:* repo setup, calc-core scaffold + wired demo, env validation, CSV UI scaffold.  
  *Pending:* Neon DB initialization, rollups posting.  
- [ ] 22-b
- [ ] 22-c
- [ ] 22-d
- [ ] 22-e

---

## 3) Current Status (one-paragraph)

Monorepo and tooling in place. Web app runs with calc-core functions and a CSV import page that streams parsing in a Web Worker and shows a preview. Env schemas validate for web and worker. Mapping wizard and Neon DB are next, followed by rollup posting.

---

## 4) Next Actions (actionable queue)

1) **CSV mapping wizard (6-a remainder)** — header→field dropdowns (`itemPrice`, `shippingCharged`, `shippingCost`, `cogs`, `feeRate`); local presets; validation before proceed.  
2) **Neon DB init (2-a, 2-b)** — create project + pooling, roles `app_rw` and `app_ro`; set `DATABASE_URL` in `apps/worker/.env`.  
3) **Rollups posting (6-c)** — client computes summary after parse and POSTs only summarized rollups to worker API.

Owner: Joe
