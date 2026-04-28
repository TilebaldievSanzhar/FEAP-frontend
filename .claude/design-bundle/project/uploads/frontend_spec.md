# Frontend FEAP — техническое задание

> Связанные документы: [`ocr_integration.md`](ocr_integration.md) — OCR-эндпоинты и контракт. [`async_architecture.md`](async_architecture.md) — job-system и polling/SSE-паттерн, на которых построен UX.

## 1. Назначение

Отдельное SPA для бэкенда FEAP. Цели интерфейса:
1. **Классификация одного товара** по текстовому описанию (с поддержкой needs_input/уточнений).
2. **Классификация N товаров из документа** (инвойс / спецификация / контракт): загрузка → OCR → редактирование извлечённых позиций → массовый запуск → отслеживание прогресса → разбор результатов.
3. **Справка по коду ТН ВЭД:** ставка ЕТТ, НДС, акциз, меры НТР.
4. **Верификация мер НТР** для конкретного товара (двойное соответствие).
5. **Навигация по дереву** (раздел → группа → … → 10-знач. код).

Frontend деплоится **отдельно** от бэкенда (отдельный репозиторий/папка). Бэкенд для него — REST API.

## 2. Технологический стек

Выбор продиктован тем, чтобы это был **must-have для индустрии в 2026**: широкая база знаний у разработчиков, типизация end-to-end, экосистема, поддержка SSR при необходимости, удобный DX.

### Базовая платформа
- **TypeScript 5.x** — обязательно. Никакого JS без типов.
- **React 19** — стабильная major-версия с Server Components (хотя SPA, мы используем только client features; SC оставляем как опцию для будущего перехода на Next.js).
- **Vite 6** — сборщик для SPA. Быстрый dev-сервер, понятная конфигурация. Альтернатива (Next.js) — overkill для текущей задачи (нет SEO-нужды, нет страниц-маркетинга).

### Маршрутизация
- **TanStack Router 1.x** — типизированные роуты, file-based routing, лучшая интеграция с TanStack Query. Альтернатива React Router v7 допустима, но TanStack даёт больше типобезопасности «из коробки» (params/search валидируются Zod).

### State management
- **TanStack Query 5.x (React Query)** — для всего серверного state: `/classify`, `/jobs`, `/tnved/*`, `/ntm/*`. Кеширование, рефетч, optimistic updates.
- **Zustand 5.x** — для UI state (открыт ли drawer, что в форме draft, какой шаг визарда). Лёгкая альтернатива Redux. Не используем Redux Toolkit — overkill для нашего scope.
- **TanStack Query mutations + cache invalidation** — паттерн для submit-форм; не плодим отдельные сторы под каждую мутацию.

### UI-библиотека
- **shadcn/ui** (radix-ui под капотом, Tailwind CSS для стилей) — копируем компоненты в свой репозиторий, полная кастомизация. Стандарт индустрии для product-grade UI.
- **Tailwind CSS 4.x** — utility-first, быстрая разработка.
- **lucide-react** — иконки (используется по умолчанию в shadcn).

Альтернативы и почему отвергаем:
- *Mantine / Chakra UI* — более «готовое», но менее гибкое; кастомизировать дизайн труднее.
- *MUI* — overengineered для нашего объёма экранов.
- *Свой дизайн-токен с нуля* — не имеет смысла на MVP.

### Формы и валидация
- **React Hook Form 7.x** — производительные неконтролируемые формы.
- **Zod 3.x** — схемы валидации; одна Zod-схема описывает форму, типы, runtime-проверку.
- **@hookform/resolvers** — мост между ними.

### API-клиент
- **openapi-typescript** + **openapi-fetch** — генерация типов из OpenAPI-схемы FastAPI.
  - FastAPI отдаёт `/openapi.json` автоматически.
  - На pre-build шаге генерим `src/api/types.ts` (типы) и используем `openapi-fetch` как тонкий type-safe клиент.
  - Альтернатива: `orval` — генерит и хуки TanStack Query, но сложнее кастомизировать.
  - Использование с TanStack Query — оборачиваем `openapi-fetch` вызовы в `useQuery`/`useMutation`.

### Файлы и загрузка
- **react-dropzone 14.x** — drag-and-drop area для документов.
- **filesize** — форматирование размера файла.
- *Нет* отдельной библиотеки для chunked upload (наши документы умещаются в один POST, лимит 25 МБ).

### Real-time прогресс
- **EventSource (нативный)** для SSE — стандарт браузера. Обёртка `@microsoft/fetch-event-source` если нужны custom-headers.
- **TanStack Query polling fallback** — `refetchInterval: 2000` если SSE упал.

### Тестирование
- **Vitest** — юнит, быстрый, совместим с Vite.
- **@testing-library/react** — компонентные тесты.
- **Playwright** — e2e-тесты ключевых flow.
- **MSW (Mock Service Worker)** — мокаем бэкенд в Storybook и в тестах.

### Storybook (опционально, P1)
- Storybook 8.x для каталога компонентов и демо состояний (loading, empty, error, needs_input, …).

### Линтинг и форматирование
- **ESLint 9 (flat config)** + `@typescript-eslint`.
- **Prettier 3** — форматирование (отдельно от ESLint, без `eslint-plugin-prettier`).
- **Husky + lint-staged** — pre-commit hook.

### Сборка и деплой
- **Docker** для производственного образа (nginx + статика).
- `.env` через Vite (`VITE_API_BASE_URL`, `VITE_SSE_ENABLED`).
- CI: GitHub Actions / GitLab CI — `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

## 3. Структура проекта

```
feap-frontend/
├── public/
├── src/
│   ├── main.tsx
│   ├── routes/                       # TanStack Router file-based
│   │   ├── __root.tsx                # Layout: header, sidebar, theme provider
│   │   ├── index.tsx                 # Главная: одиночная классификация
│   │   ├── document/
│   │   │   ├── upload.tsx            # Загрузка документа
│   │   │   ├── $ocrJobId.review.tsx  # Просмотр результата OCR + edit
│   │   │   └── $jobId.results.tsx    # Результаты batch-классификации
│   │   ├── tnved/
│   │   │   ├── tree.tsx              # Навигация по дереву
│   │   │   └── $code.tsx             # Карточка кода
│   │   ├── ntm/
│   │   │   ├── lookup.tsx            # GET /ntm/{code}
│   │   │   └── verify.tsx            # POST /ntm/verify
│   │   └── jobs/
│   │       └── index.tsx             # История задач (если auth есть)
│   ├── api/
│   │   ├── client.ts                 # openapi-fetch instance
│   │   ├── types.ts                  # сгенерированные типы (gitignored)
│   │   ├── classify.ts               # хуки: useClassify, useResume, useBatch
│   │   ├── ocr.ts                    # useOcrUpload, useOcrJob
│   │   ├── jobs.ts                   # useJob, useJobItems, useJobEventsSSE
│   │   ├── tnved.ts                  # useTreeNode, useCodeLookup
│   │   └── ntm.ts                    # useNtm, useNtmVerify
│   ├── components/
│   │   ├── ui/                       # shadcn/ui copies (Button, Input, ...)
│   │   ├── classify/
│   │   │   ├── SingleClassifyForm.tsx
│   │   │   ├── ClassificationResultCard.tsx
│   │   │   ├── ClassificationChain.tsx
│   │   │   ├── NeedsInputDialog.tsx
│   │   │   └── ClassificationStatusBadge.tsx
│   │   ├── document/
│   │   │   ├── DocumentDropzone.tsx
│   │   │   ├── DocumentTypeSelector.tsx
│   │   │   ├── OcrProgressPanel.tsx
│   │   │   ├── ExtractedProductsTable.tsx     # редактируемая таблица
│   │   │   └── ExtractedProductRow.tsx
│   │   ├── jobs/
│   │   │   ├── JobProgressBar.tsx
│   │   │   ├── JobItemsList.tsx
│   │   │   ├── JobItemCard.tsx
│   │   │   ├── BatchAnswerDialog.tsx           # сборка ответов на needs_input
│   │   │   └── useJobLive.ts                    # SSE+polling fallback hook
│   │   ├── tnved/
│   │   │   ├── TreeBrowser.tsx
│   │   │   ├── CodeChain.tsx
│   │   │   ├── DutyVatExciseCard.tsx
│   │   │   └── NtmSummaryCard.tsx
│   │   └── ntm/
│   │       ├── NtmMeasureCard.tsx
│   │       └── NtmVerifyForm.tsx
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useIdempotencyKey.ts
│   │   └── useToast.ts
│   ├── stores/
│   │   ├── ui.ts                       # zustand: theme, sidebar
│   │   └── draft.ts                    # zustand: незавершённые формы (persist)
│   ├── lib/
│   │   ├── format.ts                   # formatCode, formatPercent, formatBytes
│   │   ├── errors.ts                   # parseApiError → user-readable
│   │   └── sse.ts                      # EventSource wrapper
│   ├── styles/
│   │   └── globals.css
│   └── i18n/
│       ├── ru.json                     # русский (primary)
│       └── ky.json                     # кыргызский (P2)
├── tests/
│   ├── setup.ts
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .storybook/                          # P1
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── eslint.config.js
├── .env.example
└── Dockerfile
```

## 4. UX-флоу

### 4.1. Сценарий A — Классификация одного товара

```
[Главная]
  ▼ юзер вводит описание
[SingleClassifyForm] (textarea + optional structured fields)
  ▼ submit → POST /classify
  ▼ ответ status:
       ├─ "completed" → [ClassificationResultCard]
       ├─ "needs_input" → [NeedsInputDialog]
       │        ▼ юзер заполняет → POST /classify/{session_id}/answer
       │        ▼ повторяется до completed/error/лимит
       └─ "error" → [ErrorBanner]
```

**Детали:**
- Поле `additional_info` — раскрывающийся блок «Дополнительные параметры» с парами key/value.
- При `needs_input` диалог не модальный-блокирующий, а side-panel — пользователь видит цепочку решений (`classification_chain_so_far`) рядом с вопросами.
- Внутри диалога — поля по списку `questions` + textarea «Свободный комментарий».
- Ответы — `dict[string, string]`. Ключ = текст параметра из `missing_parameters`, значение = ввод пользователя.
- Лимит SESSION_MAX_ANSWERS=3 → после 3-й попытки UI показывает «Лимит уточнений исчерпан, опишите подробнее» и предлагает начать сначала.

### 4.2. Сценарий B — Классификация из документа

```
[document/upload]
  ▼ drag-and-drop файла + выбор document_type (опц.)
  ▼ POST /ocr/jobs (auto_classify=false)
  → ocr_job_id
[document/{ocrJobId}/review]
  ▼ live-progress по OCR (SSE/poll)
  ▼ когда status=completed → [ExtractedProductsTable]
  ▼ юзер редактирует строки:
      • удалить (мусорные строки, услуги)
      • объединить (две строки = один товар)
      • разделить (одна строка = два товара)
      • дополнить description (например, материал)
  ▼ кнопка «Запустить классификацию (N товаров)»
  ▼ POST /classify/batch с items=массив отредактированных карточек
  → batch job_id
[document/{jobId}/results]
  ▼ JobProgressBar (SSE/poll)
  ▼ JobItemsList — список с фильтрами
       (completed | needs_input | failed | running | pending)
  ▼ для needs_input items → BatchAnswerDialog (один диалог на все
    зависшие позиции, юзер заполняет всё разом → POST /jobs/{id}/answers)
  ▼ для failed → кнопка «Повторить» (POST /jobs/{id}/retry-failed)
  ▼ при finished — экспорт результатов (CSV / JSON)
```

**Ключевые детали:**

#### `ExtractedProductsTable` — редактирование извлечённых товаров
Это **главный** инструмент сценария B. Таблица должна позволять:
- Inline-редактирование `normalized_description`, `material`, `quantity`, `unit`.
- Кнопка «×» — пометить строку «не товар» (из неё не создастся item).
- Drag-handle для объединения двух строк (P1).
- «Дублировать» — для split одной OCR-строки в два товара.
- Bulk-action: «Применить страну происхождения ко всем».
- Вверху — баннер `total: 30 (28 включено, 2 пропущено)`.
- Каждая строка раскрывается в подробную карточку (полная `ProductCard` + `raw_row` от OCR).

UI-компонент: переиспользовать `@tanstack/react-table` для сложной таблицы.

#### Прогресс OCR
В `OcrProgressPanel`:
```
[●●●○] OCR обрабатывает документ
      Этап 3/4: Извлечение товарных карточек (LLM)
      ~30 сек
```

Этапы из `progress.stage`: `uploading` → `ocr_processing` → `extracting` → `completed`.

#### Прогресс batch-классификации
В `JobProgressBar`:
```
Классификация товаров
[████████████░░░░░░░░] 18 / 30
✓ 16 готово   ⚠ 2 нужны уточнения   ✗ 0 ошибок   ⟳ 8 в работе   ○ 4 в очереди
```

Чипы кликабельные → фильтр в `JobItemsList`.

#### `BatchAnswerDialog`
Если 5 товаров требуют уточнений, не открывать 5 диалогов подряд. Один диалог:
```
Уточнения по 5 товарам:

▼ Товар №3: "Электрическая зубная щётка..."
    Цепочка: XVI → 85 → 8509
    Параметр: мощность электродвигателя
    [______________] кВт

▼ Товар №7: "Хлопковая ткань..."
    Цепочка: XI → 52
    Параметр: процент содержания хлопка
    [______________] %

...

[Отправить все ответы]   [Сохранить как черновик]
```

Submit отправляет один `POST /jobs/{id}/answers` с массивом `{item_id, answers}`.

### 4.3. Сценарий C — Поиск по коду

```
[tnved/tree] — навигация по дереву (lazy expand)
   или
[tnved/{code}] — прямой ввод кода

[CodeChain]            — section → group → ... → leaf
[DutyVatExciseCard]    — ставки
[NtmSummaryCard]       — список мер с возможностью клика → /ntm/verify
```

### 4.4. Сценарий D — Верификация НТР

```
[ntm/verify]
  ▼ форма: code + product_description
  ▼ POST /ntm/verify
  ▼ список NtmVerifiedMeasure: каждая со статусом
       (applies | does_not_apply | uncertain) и обоснованием LLM
```

## 5. Контракты с бэкендом

### 5.1. Источник правды
`/openapi.json` от FastAPI. На каждом билде (или вручную через npm-скрипт) генерим `src/api/types.ts`.

```json
// package.json
{
  "scripts": {
    "api:generate": "openapi-typescript http://localhost:8000/openapi.json -o src/api/types.ts",
    ...
  }
}
```

### 5.2. Базовый клиент

```typescript
// src/api/client.ts
import createClient from "openapi-fetch";
import type { paths } from "./types";

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
});

api.use({
  onRequest({ request }) {
    const idemKey = sessionStorage.getItem("idempotency-key");
    if (idemKey && request.method === "POST") {
      request.headers.set("Idempotency-Key", idemKey);
    }
    return request;
  },
});
```

### 5.3. TanStack Query хуки

```typescript
// src/api/classify.ts
export function useClassify() {
  return useMutation({
    mutationFn: async (req: ClassifyRequest) => {
      const { data, error } = await api.POST("/api/v1/classify", { body: req });
      if (error) throw error;
      return data;
    },
  });
}

export function useResume(sessionId: string) {
  return useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      const { data, error } = await api.POST(
        "/api/v1/classify/{session_id}/answer",
        { params: { path: { session_id: sessionId } }, body: { answers } },
      );
      if (error) throw error;
      return data;
    },
  });
}
```

### 5.4. SSE-хук

```typescript
// src/components/jobs/useJobLive.ts
export function useJobLive(jobId: string) {
  const queryClient = useQueryClient();
  const job = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJob(jobId),
    refetchInterval: (q) => isTerminal(q.state.data?.status) ? false : 5000, // polling fallback
  });

  useEffect(() => {
    if (!import.meta.env.VITE_SSE_ENABLED) return;
    const es = new EventSource(
      `${import.meta.env.VITE_API_BASE_URL}/api/v1/jobs/${jobId}/events`
    );
    es.addEventListener("progress", () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    });
    es.addEventListener("item_done", (e) => {
      const payload = JSON.parse(e.data);
      queryClient.setQueryData(
        ["job", jobId, "items"],
        updateItem(payload),
      );
    });
    es.addEventListener("finished", () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      es.close();
    });
    return () => es.close();
  }, [jobId, queryClient]);

  return job;
}
```

При `VITE_SSE_ENABLED=false` — работает только polling каждые 5 сек.

### 5.5. Idempotency

Для `POST /classify/batch` и `POST /ocr/jobs` — генерим UUID на mount формы, кладём в `sessionStorage`, пересылаем как `Idempotency-Key`. Бэкенд на стороне ТЗ async-architecture обязан поддержать (см. [`async_architecture.md`](async_architecture.md#16-открытые-вопросы)).

## 6. Дизайн-система

### Палитра
- Лаконичный, корпоративно-нейтральный (это ВЭД-инструмент, не consumer-продукт).
- shadcn/ui дефолтная палитра + кастомный primary brand color (бирюзовый/индиго на выбор стейкхолдера).
- Поддержка light/dark theme (Tailwind class-based dark mode).

### Типографика
- Inter (Google Fonts) для основного текста.
- JetBrains Mono / Geist Mono для кодов ТН ВЭД и JSON-секций.

### Семантика статусов
- `completed` — зелёный (`emerald-500`).
- `running` / `pending` — синий / нейтральный.
- `needs_input` — жёлтый (`amber-500`) с иконкой `?`.
- `failed` — красный (`red-500`).
- `cancelled` — серый.

Использовать **одинаковый** цвет/иконку во всех контекстах (job, item, single classify).

## 7. Детальная спецификация ключевых компонентов

### 7.1. `SingleClassifyForm`

**Поля:**
- `description` (textarea, required, min 3 символа).
- Раскрывающийся блок «Дополнительные параметры» (key-value pairs):
  - `additional_info` собирается из них в `Record<string, string>`.
- Submit кнопка → `useClassify`.

**Валидация (Zod):**
```typescript
const schema = z.object({
  description: z.string().min(3, "Минимум 3 символа"),
  additionalInfo: z.array(z.object({
    key: z.string().min(1),
    value: z.string().min(1),
  })).optional(),
});
```

**Состояния:**
- idle — форма пустая.
- submitting — кнопка disabled, спиннер.
- result — показываем `ClassificationResultCard` ниже формы.
- needs_input — открываем `NeedsInputDialog`.
- error — toast + inline error.

### 7.2. `ClassificationResultCard`

Показывает `ClassificationResult`:
- Заголовок: `final_code` крупно, `code_formatted` рядом, кнопка «копировать».
- `code_description`.
- `ClassificationChain` (визуально — стрелки section → group → ... → code_10) с раскрытием reasoning по каждому шагу.
- Карточки рядом: `duty_rate`, `vat_rate`, ссылка на полный lookup `/tnved/{code}`.
- `confidence` как progress bar.
- `risk_flags` — список с иконкой warning.
- `requires_human_review` → ярлык «Требуется проверка эксперта».
- `opi_applied` — список chips «ОПИ 1», «ОПИ 3б».

### 7.3. `NeedsInputDialog`

Side-panel (не центрированный модал). Левая колонка — цепочка решений до текущего уровня, правая — форма ответов.

```
[слева]                          [справа]
ЦЕПОЧКА                           УТОЧНЕНИЯ
✓ Раздел XVI                      Чтобы завершить классификацию,
✓ Группа 85                       уточните:
✓ Позиция 8509
? Субпозиция (нужны данные)        ▸ мощность электродвигателя
                                       [____________]

                                  [Отправить ответы]
```

Submit → `useResume(sessionId)`. После ответа: либо снова показать диалог с новыми вопросами, либо закрыть и показать `ClassificationResultCard`.

### 7.4. `DocumentDropzone`

- react-dropzone, accept: `application/pdf, image/*`.
- Лимит: `OCR_MAX_FILE_MB` (получаем из `/health` или конфига; default 25 МБ).
- При drop — превью (имя, размер, иконка), кнопка «×» для удаления.
- Опциональный select `document_type`.
- Чекбокс «Автоматически классифицировать после OCR» (default: false).
- Submit → `POST /ocr/jobs` → редирект на `/document/{ocrJobId}/review`.

### 7.5. `ExtractedProductsTable`

Это сердце сценария B. Подробности структуры — выше в §4.2.

**Технические замечания:**
- @tanstack/react-table.
- Локальный draft state в Zustand с `persist({ name: 'draft-' + ocrJobId })` — пользователь может закрыть вкладку и вернуться, не потеряв правки.
- Diff между исходным OCR-результатом и текущим draft показывается баннером «Изменено: 3 строки, удалено: 2».
- Submit → `POST /classify/batch` с массивом отредактированных `ProductCard`.

### 7.6. `BatchAnswerDialog`

Подробности в §4.2. Технически:
- Список item'ов с `status='needs_input'`, для каждого — accordion, внутри — поля по `partial.questions`.
- `react-hook-form` для всех вопросов в одном `useForm`.
- Submit → `POST /jobs/{id}/answers` (батчевый). После ответа сервер вернёт обновлённый снапшот job + items; TanStack Query инвалидирует кеш.
- Отдельная кнопка «Сохранить как черновик» — пишет в Zustand persist.

## 8. Производительность

- **Code-splitting** по роутам (Vite + TanStack Router делает автоматически).
- **Виртуализация** `ExtractedProductsTable` и `JobItemsList` при N > 100 (TanStack Virtual).
- **Suspense boundaries** на каждом роуте → skeleton loaders без white flash.
- **Prefetch** соседних роутов на hover (TanStack Router built-in).
- **Image optimization** — иконок мало, эффект незначителен; шрифты — `font-display: swap`.
- **Bundle budget:** initial JS < 250 КБ gzip. Контролируем `vite-plugin-bundle-analyzer`.

## 9. Доступность (a11y)

- shadcn/ui основан на radix → клавиатурная навигация и ARIA «из коробки».
- Все интерактивные элементы фокусируемы.
- Контраст не ниже WCAG AA.
- `prefers-reduced-motion` — отключаем анимации.
- Скринридерам: progress-bars с `aria-valuenow`, `aria-busy` для live-обновляемых регионов, `role="status"` для toast'ов.

## 10. Интернационализация

- **Русский — primary** (большинство интерфейса бэкенда уже на русском).
- **Кыргызский — P2** (целевой регион — Кыргызстан).
- Подход: `react-i18next` с JSON-словарями. Все строки UI → ключ + `t()`. Серверные строки (например, текст ОПИ, описания кодов) — отдаются на русском, переводу не подлежат.
- Переключатель языка в header.

## 11. Аутентификация (вне scope MVP)

Текущий бэкенд auth не имеет. Когда появится:
- OAuth2 / JWT в `Authorization: Bearer`.
- Хранение токена в memory (refresh) + httpOnly cookie (long-lived).
- Защита роутов через `beforeLoad` в TanStack Router.
- Per-user история job'ов в `/jobs/`.

Frontend закладывает middleware-слой `api/auth.ts`, который сейчас no-op, потом подключится.

## 12. Конфигурация (.env)

| Переменная | Описание | Пример |
|---|---|---|
| `VITE_API_BASE_URL` | Базовый URL бэкенда | `http://localhost:8000` |
| `VITE_SSE_ENABLED` | Использовать SSE (false → polling-only) | `true` |
| `VITE_SSE_HEARTBEAT_TIMEOUT_MS` | После какого таймаута без heartbeat считаем SSE мёртвым | `45000` |
| `VITE_OCR_MAX_FILE_MB` | Должно совпадать с бэкендом | `25` |
| `VITE_BATCH_SYNC_MAX` | Должно совпадать с бэкендом | `5` |
| `VITE_DEFAULT_LOCALE` | `ru` / `ky` | `ru` |
| `VITE_BUILD_VERSION` | Подставляется CI | `1.0.0+sha.abcdef` |

Все vite-переменные должны начинаться с `VITE_`. На рантайме в продакшне — НЕ через `.env`, а через runtime-config (`/config.json`, отдаваемый nginx) — иначе билд приходится пересобирать на каждое окружение. Реализуем `runtime-config-loader.ts` на старте `main.tsx`.

## 13. Сборка и деплой

### Dockerfile

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run typecheck && npm run test:unit && npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

`docker-entrypoint.sh` собирает `/usr/share/nginx/html/config.json` из env-переменных перед стартом nginx.

`nginx.conf`:
- SPA-fallback на `index.html`.
- Gzip + brotli.
- Cache headers: `cache-control: no-cache` для `index.html` и `config.json`, `immutable, max-age=31536000` для `assets/*`.
- Proxy на бэкенд (если backend на другом домене и нужен CORS-обход) — *опционально*.

## 14. Тесты

| Уровень | Что покрываем |
|---|---|
| unit (Vitest) | хелперы `format.ts`, `errors.ts`, redux-подобные стор-методы, валидаторы Zod |
| component (Vitest + Testing Library) | `SingleClassifyForm`, `NeedsInputDialog`, `ExtractedProductsTable` (rendering states), `JobProgressBar` |
| integration (Vitest + MSW) | полный flow single classify → needs_input → answer → completed |
| e2e (Playwright) | сценарии A, B, C полностью; критические — в CI на каждый PR |

Каждый компонент с состояниями (idle/loading/error/success) — стори в Storybook (P1), там же визуальная регрессия через chromatic / loki (P2).

## 15. Roadmap

### Sprint 1 — MVP single-product
- Stack setup (Vite, TS, Tailwind, shadcn, TanStack Query/Router, RHF+Zod).
- API client + кодогенерация типов.
- Сценарий A полностью (форма → результат → needs_input).
- Сценарий C (поиск по коду).
- Базовая i18n (только ru).
- CI + Docker.

### Sprint 2 — Document upload + batch
- Сценарий B без редактирования (загрузка → авто-classify → результаты).
- `JobProgressBar` + polling.
- `BatchAnswerDialog`.
- Экспорт результатов в CSV.

### Sprint 3 — Document review + edit
- `ExtractedProductsTable` с inline-edit.
- Draft-persist в Zustand.
- SSE-канал для live-прогресса.
- Сценарий D (NTM verify).

### Sprint 4 — Polish
- Storybook + visual tests.
- Доступность audit.
- Performance audit (Lighthouse > 90).
- i18n: добавить ky.
- Auth (если бэкенд готов).

## 16. Ключевые принципы и не-цели

### Принципы
- **Тип-безопасность от схемы FastAPI до JSX.** Все ответы API типизированы, никаких `any`.
- **Серверный state — TanStack Query, UI-state — Zustand.** Не смешиваем.
- **Идемпотентность форм.** Двойной submit не создаёт двух job'ов.
- **Прогрессивное раскрытие.** Сложные сценарии (split строк, ручной retry) скрыты под раскрывающимися блоками — для новичков начинать просто.
- **Реакция на failure.** Любой ошибочный ответ от API → toast + объяснение + предложение действия (retry / скопировать ID запроса для саппорта).

### Не-цели (за рамками этого ТЗ)
- SEO / SSR / маркетинговые landing-страницы.
- Платежи, тарифы.
- Полноценная админка (модерация мер НТР, edit ставок) — отдельный продукт.
- Mobile-app (отдельный mobile-friendly responsive layout — да; нативное приложение — нет).
- Социальные функции (комменты, расшаривание).

## 17. Открытые вопросы

1. **Дизайн.** В каком формате получаем макеты? Figma, готовый design system или полная свобода у фронтенд-разработчика? Если макетов нет — берём дефолт shadcn и согласовываем итерации.
2. **Брендинг.** Лого, основной цвет, шрифт корпоративный — нужны от стейкхолдера.
3. **CSV-экспорт.** Какие колонки? Минимум: `position, original_description, final_code, code_formatted, name, duty_rate, vat_rate, confidence, status`. Уточнить с конечными пользователями (декларанты).
4. **История пользователя без auth.** Хранить `job_id` в localStorage и показывать «недавние задачи»? — рекомендую да, на P1.
5. **Обработка PDF preview.** Показывать ли превью оригинального документа рядом с `ExtractedProductsTable`? — Полезно, но требует client-side PDF-renderer (`react-pdf`). Включаем в P2.
6. **Tracking / analytics.** PostHog / Plausible / нет аналитики — решение стейкхолдера; на MVP можно без.
