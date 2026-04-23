# FEAP Frontend

SPA for the FEAP backend (TN VED classifier). Built with Vite + React 19 + TypeScript, TanStack Router/Query, Tailwind 4 + shadcn/ui primitives, React Hook Form + Zod.

See [`frontend_spec.md`](docs/frontend_spec.md), [`async_architecture.md`](docs/async_architecture.md), [`ocr_integration.md`](docs/ocr_integration.md) for the full spec.

## Sprint status

Current: **Sprint 2 — Document upload + batch**

- [x] Sprint 1 scope (single classify, TN VED lookup, i18n, Docker, CI)
- [x] Scenario B (no-edit): upload → OCR progress → auto-classify → results
- [x] `DocumentDropzone`, `DocumentTypeSelector`, `OcrProgressPanel`
- [x] `JobProgressBar` with status chip filters + polling via TanStack Query
- [x] `JobItemsList` / `JobItemCard` with per-item chain, rates, confidence
- [x] `BatchAnswerDialog` — one dialog for all `needs_input` items → batch POST
- [x] CSV export of job results (`/document/$jobId/results`)
- [x] Retry failed items
- [ ] Replace stub types with generated ones (`npm run api:generate` against a running backend)

Next up: Sprint 3 (inline-edit `ExtractedProductsTable`, Zustand draft persist, SSE live-progress, Scenario D — NTM verify).

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

## Notes for Sprint 3 handoff

- `src/api/types.ts` is still a hand-written stand-in. Point `api:generate` at a live FastAPI and switch imports to `./types.generated`.
- `src/routeTree.gen.ts` is a stub committed only so `tsc` passes on a fresh clone; Vite's TanStack Router plugin overwrites it on every build (now covers `/document/*` routes).
- Sprint 2 polls `/api/v1/jobs/{id}` and `/api/v1/jobs/{id}/items` every 3 s via TanStack Query; Sprint 3 should wrap this in a `useJobLive` hook that layers SSE from `/api/v1/jobs/{id}/events` on top and falls back to polling when `VITE_SSE_ENABLED=false`.
- Scenario B currently ships the no-edit flow: the review route (`/document/$ocrJobId/review`) lists extracted products read-only. Sprint 3 replaces this with `ExtractedProductsTable` (inline edit, skip, duplicate/split, country bulk-action) and a Zustand `persist` draft keyed on `ocrJobId`.
- NTM screens (`/ntm/lookup`, `/ntm/verify`) and NTM API hook (`src/api/ntm.ts`) exist from Sprint 1; the routes themselves land in Sprint 3 alongside `NtmVerifyForm` / `NtmMeasureCard`.
