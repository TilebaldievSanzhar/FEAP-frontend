# FEAP Frontend

SPA for the FEAP backend (TN VED classifier). Built with Vite + React 19 + TypeScript, TanStack Router/Query, Tailwind 4 + shadcn/ui primitives, React Hook Form + Zod.

See [`frontend_spec.md`](docs/frontend_spec.md), [`async_architecture.md`](docs/async_architecture.md), [`ocr_integration.md`](docs/ocr_integration.md) for the full spec.

## Sprint status

Current: **Sprint 4 — Polish (live-API wiring, a11y, i18n, perf, auth hook)**

- [x] Sprint 1 scope (single classify, TN VED lookup, i18n, Docker, CI)
- [x] Sprint 2 scope (OCR upload, batch results, BatchAnswerDialog, CSV, retry)
- [x] Sprint 3 scope (`ExtractedProductsTable`, draft `persist`, `useJobLive` SSE+polling, NTM lookup + verify)
- [x] **Generated types + adapter layer.** `npm run api:generate` now writes [`src/api/types.generated.ts`](src/api/types.generated.ts) from the live FastAPI. Boundary adapters in [`src/api/adapters.ts`](src/api/adapters.ts) translate wire shapes (e.g. `ClassificationChain` as an object, `NtmSummary.measures`, `StructuredProduct`) into the UI-facing model in [`src/api/types.ts`](src/api/types.ts). 16 adapter unit tests in [`tests/unit/adapters.test.ts`](tests/unit/adapters.test.ts).
- [x] **Endpoint fixes** against the live backend: `/tnved/tree?parent_code=…`, `/tnved/lookup/{code}`, `/ntm/{code}` (unwrap `.ntm.measures`), `/ocr/jobs` (multi-file `files[]`, no `document_type`), new OCR stages `pending → extracting → structuring → completed`. Dropped the `retry-failed` button since the backend does not expose that endpoint.
- [x] **Auth middleware stub** in [`src/api/auth.ts`](src/api/auth.ts): `getAuthToken` / `setAuthToken` / `addUnauthorizedListener`. The API client attaches `Authorization: Bearer <token>` when a token is set and calls `onUnauthorized()` on every 401 so downstream listeners (future `/login` redirect, toast) can react. No-op until the backend offers JWT.
- [x] **Kyrgyz locale (`ky`)** with full parity to `ru.json`. Header switcher persists the chosen locale in the Zustand `feap-ui` store (`version: 2`); [`src/main.tsx`](src/main.tsx) bootstraps with the saved locale, falling back to `VITE_DEFAULT_LOCALE`. `<html lang>` is updated on every change.
- [x] **A11y audit pass.** Skip-link to `#main-content` (`sr-only` + `focus:not-sr-only`), focus-ring on the dropzone, `aria-live` / `aria-busy` on `OcrProgressPanel` + `JobProgressBar`, `aria-valuenow` on both `Progress` bars, accessible name + `aria-describedby` on the dropzone, Radix-Sheet close button gets an `aria-label`, `prefers-reduced-motion` already kills animations globally.
- [x] **Performance.** `vite.config.ts` now declares `manualChunks` (react / router / query / radix / icons / i18n / sonner / forms) so big vendor libs cache independently of route code. Production build splits into 10 chunks, initial gzip payload ≈ 210 KB — under the 250 KB budget from the spec.
- [x] **Storybook stories (scaffold).** CSF3 `*.stories.tsx` files next to key components (`ClassificationResultCard`, `NeedsInputDialog`, `JobProgressBar`, `ExtractedProductsTable`, `NtmMeasureCard`). Storybook itself is not installed yet — run `npx storybook@latest init` and the stories activate. Excluded from `tsc` via `tsconfig.app.json`.

### Known gaps (Sprint 5 / P2)

- Virtualize `JobItemsList` and `ExtractedProductsTable` with `@tanstack/react-virtual` when N > 100. Today both render flat and rely on the backend's `next_cursor` for pagination.
- Lighthouse pass: manual measurement still TODO; the bundle budget is met, `prefers-reduced-motion` is wired, font-display swap is default.
- Visual regression (chromatic / loki) once Storybook is installed.
- PDF preview next to the review table (`react-pdf`), history panel for anonymous users (`localStorage` of recent job_ids).

## Getting started

```bash
npm install
cp .env.example .env
npm run dev                # http://localhost:5173
```

Backend must be reachable at `VITE_API_BASE_URL` (default `http://localhost:8000`). To regenerate API types against a running backend: `npm run api:generate`.

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
| `VITE_DEFAULT_LOCALE` | `ru` (also accepts `ky`) |
| `VITE_BUILD_VERSION` | `dev` |

## Architecture notes

- **Types:** `src/api/types.ts` is the UI model; `src/api/types.generated.ts` is the wire model (regenerated by `api:generate`). Never import `types.generated` from components — only from `src/api/*.ts` and `src/api/adapters.ts`.
- **Draft store:** [`src/stores/draft.ts`](src/stores/draft.ts) persists per-`ocrJobId` edits in `localStorage` under `feap-extract-drafts`. Cleared on successful batch submit; `resetDraft` reverts to the OCR baseline.
- **Live updates:** [`src/components/jobs/useJobLive.ts`](src/components/jobs/useJobLive.ts) attaches an `EventSource` to `/api/v1/jobs/{id}/events` and patches the TanStack Query cache on `item_done` / `item_needs_input` / `item_failed`; `progress` and `finished` invalidate instead. When `VITE_SSE_ENABLED=false` (or the connection drops) it collapses to 3-second polling via the same `useJob` / `useJobItems` hooks.
- **Auth:** [`src/api/auth.ts`](src/api/auth.ts) holds the token in memory; [`src/api/client.ts`](src/api/client.ts) attaches it automatically unless `anonymous: true` is passed. 401 triggers `onUnauthorized` which clears the token and fans out to subscribers.
- **NTM rendering:** `NtmMeasureCard` works for both lookup (`NtmMeasure` with `status: "may_apply" | "applies" | "informational"`) and verify (`NtmVerifiedMeasure` with `reasoning`). Styling switches on the `status` discriminator.
