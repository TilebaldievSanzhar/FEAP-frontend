# FEAP Frontend

SPA for the FEAP backend (TN VED classifier). Built with Vite + React 19 + TypeScript, TanStack Router/Query, Tailwind 4 + shadcn/ui primitives, React Hook Form + Zod.

See [`frontend_spec.md`](docs/frontend_spec.md), [`async_architecture.md`](docs/async_architecture.md), [`ocr_integration.md`](docs/ocr_integration.md) for the full spec.

## Sprint status

Current: **Sprint 3 — Document review + edit, SSE, NTM**

- [x] Sprint 1 scope (single classify, TN VED lookup, i18n, Docker, CI)
- [x] Sprint 2 scope (OCR upload, batch results, BatchAnswerDialog, CSV, retry)
- [x] `ExtractedProductsTable` with inline-edit, skip/restore, duplicate, bulk country, row remove
- [x] Zustand `persist` draft keyed on `ocrJobId` (survives reload, shows dirty diff, reset)
- [x] `useJobLive` hook — SSE via `/api/v1/jobs/{id}/events` with polling fallback (15 s vs 3 s)
- [x] Live indicator on results screen (`RadioTower`/`Activity` badge)
- [x] Scenario D — `/ntm/lookup` and `/ntm/verify` routes with `NtmVerifyForm`, `NtmMeasureCard`
- [ ] Replace stub types with generated ones (`npm run api:generate` against a running backend)

Next up: Sprint 4 (Storybook, a11y audit, perf audit, ky i18n, auth when backend ready).

## Getting started

```bash
npm install
cp .env.example .env
npm run dev                # http://localhost:5173
```

Backend must be reachable at `VITE_API_BASE_URL` (default `http://localhost:8000`).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server. TanStack Router plugin regenerates `src/routeTree.gen.ts`. |
| `npm run build` | `tsc -b && vite build` → `dist/`. |
| `npm run typecheck` | `tsc -b --noEmit`. |
| `npm run lint` | ESLint flat config. |
| `npm run test` / `npm run test:unit` | Vitest. |
| `npm run api:generate` | Regenerate `src/api/types.generated.ts` from a live `/openapi.json`. |

## Runtime configuration

The image reads `/config.json` at boot (see `docker-entrypoint.sh`) so one built image can be promoted across environments without a rebuild. Env vars:

| Variable | Default |
| --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000` |
| `VITE_SSE_ENABLED` | `true` |
| `VITE_OCR_MAX_FILE_MB` | `25` |
| `VITE_BATCH_SYNC_MAX` | `5` |
| `VITE_DEFAULT_LOCALE` | `ru` |
| `VITE_BUILD_VERSION` | `dev` |

## Notes for Sprint 4 handoff

- `src/api/types.ts` is still a hand-written stand-in. Point `api:generate` at a live FastAPI and switch imports to `./types.generated`.
- `src/routeTree.gen.ts` is a stub committed only so `tsc` passes on a fresh clone; Vite's TanStack Router plugin overwrites it on every build (now covers `/document/*` and `/ntm/*`).
- `useJobLive` ([`src/components/jobs/useJobLive.ts`](src/components/jobs/useJobLive.ts)) attaches an `EventSource` to `/api/v1/jobs/{id}/events` and patches the TanStack Query cache in place on `item_done` / `item_needs_input` / `item_failed` events; `progress` and `finished` invalidate instead. When `VITE_SSE_ENABLED=false` (or the browser drops the connection) it collapses to 3-second polling via the same `useJob` / `useJobItems` hooks.
- Draft store: [`src/stores/draft.ts`](src/stores/draft.ts) persists per-`ocrJobId` edits in `localStorage` under `feap-extract-drafts`. Clear on successful batch submit; call `resetDraft` to revert to OCR baseline.
- NTM: `NtmMeasureCard` renders both `NtmMeasure` (lookup) and `NtmVerifiedMeasure` (verify), switching styling based on the `status` discriminator. `/ntm/verify` uses Zod + React Hook Form like the classify flow.
- Sprint 4 scope: Storybook states for the table, a11y audit (focus/keyboard on dropzone + sheet), Lighthouse pass, `ky.json` locale, auth middleware wiring when backend offers JWT.
