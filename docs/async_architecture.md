# Асинхронность и параллелизм в FEAP — техническое задание

> Связанные документы: [`ocr_integration.md`](ocr_integration.md) (модуль OCR работает поверх описанного здесь job-system), [`frontend_spec.md`](frontend_spec.md) (UX опирается на единый паттерн polling/SSE).

## 1. Текущее состояние

### Что уже есть
- **FastAPI + Uvicorn** — async-фреймворк.
- **SQLAlchemy 2.0 (async)** + asyncpg — все запросы к БД неблокирующие.
- **Каскад L0–L5** реализован как `await`-цепочка вызовов LLM (через `httpx.AsyncClient`) — внутри одного запроса всё уже async.
- **`classification_sessions`** — JSONB-снапшот `CascadeState` для needs_input/resume.
- **NTM verifier** на отдельной модели (level=99), отдельный POST.

### Что отсутствует
- **Параллельная классификация N товаров** в одном запросе. Текущий API строго один товар = один запрос.
- **Долговременные фоновые задачи.** Если каскад занимает 30+ секунд, клиент держит HTTP-соединение всё это время. Нет паттерна job_id + polling.
- **Batch-операции.** Нет приёма списка описаний в один запрос.
- **Контроль конкурентности к LLM.** Нет глобального семафора → теоретически можем выстрелить себе в ногу при наплыве (rate-limit OpenRouter, бюджет).
- **Прогресс по уровням каскада** недоступен извне (даже в WebSocket нечем поделиться).

### Какой реальный сценарий заставляет нас это переделать
Документ инвойса содержит 30 позиций. Каждая позиция — независимая классификация на 6 уровней (10–60 секунд). Если всё последовательно — пользователь ждёт 5–30 минут с зависшим HTTP-соединением. Если параллельно без ограничений — 30 одновременных каскадов × 6 LLM-вызовов = 180 параллельных запросов в OpenRouter, мы упрёмся в rate-limit.

**Нужно:** механизм асинхронной фоновой обработки с контролем конкурентности и прогрессом.

## 2. Принципы решения

1. **Не ломать `POST /classify`.** Existing single-product endpoint остаётся как есть. Это быстрый sync-путь для мгновенных ответов, и весь фронтенд для одного товара продолжает работать.
2. **Один паттерн для всех долгих операций.** OCR, batch-классификация, цепочка OCR→split→classify — всё через единый `Job`-абстракт. Это упрощает и backend, и фронтенд (один компонент `JobStatus`).
3. **PostgreSQL — источник истины о job-state. Redis — транспорт очереди и pub/sub.** Доменное состояние (статусы, результаты, ошибки, агрегация) живёт в `classification_jobs/_items`. Redis отвечает только за доставку «возьми этот job_id в работу» и за live-канал событий. Падение Redis не теряет данные — только ставит на паузу подхват новых job'ов.
4. **Конкурентность ограничивается на уровне ресурса.** Семафор на одновременные LLM-вызовы (а не на одновременные «job»). Глобальный rate-limit — Redis-backed (sliding window).
5. **needs_input корректно работает per-item.** В батче из 30 позиций 3 могут запросить уточнения — остальные 27 завершаются без блокировки.
6. **Production-ready с первого дня.** Воркеры на **arq** (async-native, Redis-backed). Не Celery (синхронный, плохо живёт с asyncpg/httpx.AsyncClient). Не in-process `asyncio.TaskGroup` как primary — это годится только для локальной разработки и smoke-тестов; в production-деплое (несколько инстансов FastAPI за балансировщиком, zero-downtime, blue-green) shared queue нужна с первого релиза. Recovery, retry, scheduling — встроенные возможности arq, а не костыли в нашем коде.

## 3. Job-система

### 3.1. Сущность Job

Один `Job` = одна долгоиграющая операция, у которой есть прогресс, может быть много `items`, и финальный результат.

**Типы job (`job_type`):**

| Тип | Описание | Источник items |
|---|---|---|
| `classify_batch` | Параллельная классификация списка описаний | `items[].product_card` (вход юзера) |
| `ocr` | OCR одного документа | items не используется (один документ — один результат) |
| `ocr_classify` | OCR → split → классификация N товаров (chain) | items создаются после splitter'а |

### 3.2. Жизненный цикл

```
            ┌──────────────┐
            │   pending    │  создан, ещё не подхвачен
            └──────┬───────┘
                   ▼
            ┌──────────────┐
            │   running    │  идёт обработка items
            └──────┬───────┘
              ┌────┼────────────┬────────────┐
              ▼    ▼            ▼            ▼
        completed  needs_input  partial   failed
        (всё ок)   (≥1 item    (часть    (фатально)
                    ждёт ответа) упала)
```

- **`completed`** — все items успешны.
- **`needs_input`** — ≥1 item требует уточнений; job *не финализирован*. После `POST /jobs/{id}/items/{item_id}/answer` для всех зависших → перевычисляется, может стать `completed` / `partial` / снова `needs_input`.
- **`partial`** — все items дошли до терминального состояния, но часть упала (вернулась ошибка от каскада или отменена). Финальное состояние, retry — отдельный job.
- **`failed`** — фатальная ошибка на уровне самого job'а (не одного item'а): split упал, OCR упал и т.д.

### 3.3. Item

Один `Item` = одна классификация (или одна другая атомарная операция — модель универсальная).

```
                   ┌──────────┐
                   │ pending  │
                   └─────┬────┘
                         ▼
                   ┌──────────┐
                   │ running  │
                   └─────┬────┘
            ┌─────────┬──┴─────────┬──────────┐
            ▼         ▼            ▼          ▼
       completed  needs_input    failed   cancelled
                  (привязан к
                   classification_session)
```

- `needs_input` item ↔ `classification_sessions.session_id` (FK). Когда юзер отвечает на вопросы — обращается к существующему `/classify/{session_id}/answer`, и **отдельная фоновая задача** в job'е продолжает каскад. По завершении item обновляется в БД, агрегация job'а пересчитывается.

## 4. Схема БД

### `classification_jobs`

```sql
CREATE TABLE classification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(32) NOT NULL,           -- classify_batch | ocr | ocr_classify
    status VARCHAR(32) NOT NULL,             -- pending | running | completed | needs_input | partial | failed
    
    -- Параметры запуска
    params JSONB NOT NULL,                   -- {mode, source, options...}
    
    -- Прогресс
    total_items INTEGER NOT NULL DEFAULT 0,
    completed_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,
    needs_input_items INTEGER NOT NULL DEFAULT 0,
    
    -- Связи
    parent_ocr_job_id UUID REFERENCES ocr_jobs(id) ON DELETE SET NULL,
    
    -- Финал
    error TEXT,                              -- если status='failed'
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL          -- created_at + JOB_RESULT_TTL_HOURS
);

CREATE INDEX idx_jobs_status ON classification_jobs(status);
CREATE INDEX idx_jobs_expires ON classification_jobs(expires_at);
CREATE INDEX idx_jobs_parent_ocr ON classification_jobs(parent_ocr_job_id);
```

### `classification_job_items`

```sql
CREATE TABLE classification_job_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES classification_jobs(id) ON DELETE CASCADE,
    
    position INTEGER NOT NULL,               -- порядковый номер в job'е (стабильный)
    
    -- Вход
    product_description TEXT NOT NULL,
    product_card JSONB,                      -- если уже структурирован (от splitter'а)
    additional_info JSONB,
    source_ref JSONB,                        -- {ocr_line_number, invoice_row_id, ...}
    
    -- Ход выполнения
    status VARCHAR(32) NOT NULL,             -- pending | running | completed | needs_input | failed | cancelled
    classification_session_id UUID REFERENCES classification_sessions(session_id) ON DELETE SET NULL,
    
    -- Результат (один из)
    result JSONB,                            -- ClassificationResult JSON
    partial JSONB,                           -- PartialResult JSON (если needs_input)
    error TEXT,                              -- если failed
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    UNIQUE (job_id, position)
);

CREATE INDEX idx_job_items_job ON classification_job_items(job_id);
CREATE INDEX idx_job_items_status ON classification_job_items(status);
CREATE INDEX idx_job_items_session ON classification_job_items(classification_session_id);
```

### События (опционально, для SSE/audit)

```sql
CREATE TABLE classification_job_events (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES classification_jobs(id) ON DELETE CASCADE,
    item_id UUID REFERENCES classification_job_items(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,         -- started | progress | item_done | item_needs_input | item_failed | finished | failed
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_job_created ON classification_job_events(job_id, created_at);
```

**Миграция:** `migrations/versions/008_classification_jobs.py`.

## 5. Очередь и воркеры (arq + Redis)

### 5.1. Топология

```
┌─────────────┐   POST /classify/batch    ┌──────────────┐
│  Frontend   │ ────────────────────────► │   FastAPI    │
└─────────────┘                           │   (app)      │
        ▲                                 └──────┬───────┘
        │                                        │ enqueue_job
        │ SSE                                    ▼
        │                                 ┌──────────────┐
        │                                 │    Redis     │ ◄── pub/sub: job:{id}
        │                                 │ (queue + ps) │
        └─────────────────────────────────└──────┬───────┘
                                                 │
                          ┌──────────────────────┼──────────────────────┐
                          ▼                      ▼                      ▼
                   ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
                   │  arq worker  │       │  arq worker  │       │  arq worker  │
                   │   (N=1..K)   │       │              │       │              │
                   └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
                          └──────────────────────┼──────────────────────┘
                                                 ▼
                                          ┌──────────────┐
                                          │  PostgreSQL  │  ← истина о jobs/items
                                          │  + pgvector  │
                                          └──────────────┘
```

- **app** (FastAPI) — обслуживает HTTP + создаёт записи в `classification_jobs`/`_items` + энкьюит arq-задачи + читает из БД для GET-эндпоинтов + отдаёт SSE через Redis pub/sub. **Не выполняет** саму классификацию для async-job'ов.
- **worker** (arq) — отдельный процесс/контейнер, импортирует тот же `feap.cascade.CascadeOrchestrator`, выполняет работу, пишет результаты в Postgres, публикует события в Redis.
- **redis** — очередь + pub/sub. Никаких бизнес-данных в Redis (всё в Postgres).

Один и тот же Docker-образ для `app` и `worker`, разные `command`. Конфигурация — общий `.env`.

### 5.2. Сервисы в docker-compose

```yaml
# docker-compose.yml (фрагмент, добавляется к существующим db/migrate/app)
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  worker:
    build: .
    restart: unless-stopped
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }
      migrate: { condition: service_completed_successfully }
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER:-feap}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-feap}
      REDIS_URL: redis://redis:6379/0
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      # ... остальные env как у app
    command: ["arq", "feap.jobs.worker.WorkerSettings"]
    deploy:
      replicas: ${WORKER_REPLICAS:-2}
```

`app`-сервис тоже получает `REDIS_URL` (для энкьюинга и SSE-подписки).

### 5.3. arq-функции

```python
# src/feap/jobs/worker.py
from arq.connections import RedisSettings
from feap.config import settings
from feap.jobs.tasks import (
    run_classify_batch,
    run_classify_item,
    run_ocr_job,
    run_ocr_split_and_enqueue,
    cleanup_expired_jobs,
)

class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    functions = [
        run_classify_batch,
        run_classify_item,
        run_ocr_job,
        run_ocr_split_and_enqueue,
    ]
    cron_jobs = [
        # каждый час чистим expired jobs
        cron(cleanup_expired_jobs, hour=None, minute=0),
    ]
    max_jobs = settings.WORKER_MAX_JOBS          # default 16 — concurrency внутри одного worker
    job_timeout = 60 * 60                        # 1 час на job (батч может быть длинным)
    keep_result = 0                              # результат храним в Postgres, в Redis не нужен
    on_startup = on_worker_startup               # init httpx clients, prepare semaphore
    on_shutdown = on_worker_shutdown
```

```python
# src/feap/jobs/tasks.py
async def run_classify_batch(ctx: dict, job_id_str: str) -> None:
    """Подхватываем job из очереди → fan-out по item'ам через arq."""
    job_id = UUID(job_id_str)
    redis = ctx["redis"]
    async with ctx["db_session_factory"]() as db:
        await mark_job_running(db, job_id)
        item_ids = await load_pending_item_ids(db, job_id)

    # Fan-out: каждый item — отдельный arq-job. Воркеры разберут параллельно
    # с учётом max_jobs на воркер.
    for item_id in item_ids:
        await redis.enqueue_job(
            "run_classify_item",
            str(item_id),
            _job_id=f"item:{item_id}",          # idempotency-key arq
        )

    # Завершение job'а — отдельный мониторинг (см. §5.5)


async def run_classify_item(ctx: dict, item_id_str: str) -> None:
    """Один item каскада. Этот таск — атомарная единица работы воркера."""
    item_id = UUID(item_id_str)
    sem: asyncio.Semaphore = ctx["llm_semaphore"]
    rate: AsyncLimiter = ctx["llm_rate_limiter"]
    redis = ctx["redis"]

    async with ctx["db_session_factory"]() as db:
        item = await load_item(db, item_id)
        if item.status not in ("pending", "running"):
            return                                   # idempotent re-run guard

        await mark_item_running(db, item_id)

    # Классификация — внутри неё каскад делает 6+ LLM-вызовов;
    # семафор/лимитер сидят внутри OpenRouterProvider, см. §5.4.
    try:
        async with ctx["db_session_factory"]() as db:
            response = await ctx["orchestrator"].classify(
                description=item.product_description,
                db=db,
                additional_info=item.additional_info,
            )
            await save_item_result(db, item_id, response)
            await update_job_aggregates(db, item.job_id)
        await redis.publish(
            f"job:{item.job_id}",
            json.dumps({"event": "item_done", "item_id": str(item_id), ...}),
        )
    except Exception as e:
        async with ctx["db_session_factory"]() as db:
            await mark_item_failed(db, item_id, str(e))
            await update_job_aggregates(db, item.job_id)
        await redis.publish(
            f"job:{item.job_id}",
            json.dumps({"event": "item_failed", "item_id": str(item_id), "error": str(e)}),
        )
        # arq автоматически сделает retry, если raise. Контролируем через max_tries
        # в декораторе задачи. Для нашего случая retry внутри OpenRouterProvider — не пробрасываем.
```

**Почему fan-out по item'ам, а не один таск на batch:**
- Каждый item обрабатывается **любым свободным воркером** → честный параллелизм.
- `max_jobs` arq уже ограничивает concurrency на воркер.
- При падении одного item'а остальные не страдают (нет общей `TaskGroup`).
- Идемпотентность через `_job_id=item:{id}` — если случайно энкьюим дважды, arq сам отдедупит.

### 5.4. Семафор и rate-limit

Помещаются **внутрь** `OpenRouterProvider` — тогда автоматически работают и для воркера, и для sync `/classify` в FastAPI.

```python
# src/feap/llm/openrouter_provider.py
class OpenRouterProvider:
    def __init__(self, ...):
        self._sem = asyncio.Semaphore(settings.LLM_MAX_CONCURRENT)  # per-process
        self._rate_limiter = self._build_rate_limiter()             # см. ниже

    async def classify(self, ...):
        async with self._sem, self._rate_limiter:
            return await self._do_call(...)
```

**Per-process семафор** (`asyncio.Semaphore`) — простой и точный для одного воркера.

**Глобальный rate-limit** (если у OpenRouter лимит N RPM на ключ, а у нас K воркеров):
- На MVP: `K × LLM_MAX_CONCURRENT < N` — настраиваем вручную, без распределённого лимитера. Достаточно, если K ≤ 4.
- Для большего scale — Redis-backed sliding window:

```python
# src/feap/llm/rate_limit.py
class RedisSlidingWindowLimiter:
    """RPM-лимит, разделяемый между всеми воркерами через Redis ZSET."""
    def __init__(self, redis, key: str, limit_per_min: int):
        ...
    async def __aenter__(self):
        # ZREMRANGEBYSCORE expired, ZCARD < limit, ZADD now, EXPIRE
        # Блокирует до освобождения слота.
        ...
```

Активация — `LLM_RATE_LIMIT_PER_MIN > 0`.

### 5.5. Завершение job'а (агрегация)

Когда последний item стал терминальным (`completed | failed | cancelled | needs_input`), нужно перевести job в финальный статус. Два варианта:

1. **Inline в `run_classify_item`** — после `update_job_aggregates` проверяем «остались ли pending/running items». Если нет — финализируем. Простой и работает, но есть гонка: два item'а одновременно завершают, оба видят «остался один pending», ни один не финализирует. **Решение:** `UPDATE ... WHERE pending=0 AND running=0 AND status='running' RETURNING id` — атомарно через PG, выигрывает один.
2. **Отдельный watcher-таск** — `run_finalize_job` энкьюится после каждого item'а с дедупликацией. Чище разделение ответственности.

Рекомендация: **вариант 1** (inline + атомарный UPDATE) — меньше задач в очереди, явная семантика.

### 5.6. Recovery при рестарте

**Воркер падает:** arq перезапускает таск — у него есть `max_tries` (default 5) и backoff. Идемпотентность гарантируется проверкой `item.status` в начале `run_classify_item`.

**Redis падает:** энкьюинг из FastAPI начинает фейлить → `POST /classify/batch` возвращает 503 «Очередь временно недоступна». Уже начатые в воркере item'ы доедут до конца (Postgres жив). После подъёма Redis — арq-воркеры переподключаются автоматически.

**Postgres падает:** всё лежит. Это catastrophic — но и единственный источник правды.

**Долго stuck `running` items** (воркер убит kill -9 без graceful shutdown): cron-таск `reset_stuck_items` каждые 5 минут — `UPDATE ... SET status='pending' WHERE status='running' AND updated_at < NOW() - INTERVAL '15 minutes'` → запись возвращается в очередь.

Никакого «recover_in_flight_jobs на startup FastAPI» — арq-механика это решает чище.

### 5.7. Что не используем и почему

| Альтернатива | Почему нет |
|---|---|
| **Celery** | Синхронный исполнитель. Наш стек целиком async (asyncpg, httpx.AsyncClient, AsyncSession). Обёртки `asyncio.run()` внутри sync-таска ломают connection pool, удваивают tear-up/tear-down. Eventlet/gevent monkey-patching конфликтует с asyncpg. |
| **dramatiq** | Async-режим есть, но дополнительные зависимости (RabbitMQ предпочтительнее Redis для dramatiq), более «корпоративный» стиль — overkill. |
| **RQ** | Синхронный. Не подходит. |
| **NATS / Kafka** | Избыточно: нам нужна простая work-queue, не event-streaming. |
| **In-process `asyncio.TaskGroup`** | Только для local dev/smoke-тестов. См. §5.8. |

### 5.8. Local-dev fallback (опционально)

Для smoke-тестов без Redis: env-переменная `JOBS_BACKEND=inprocess` подключает `InProcessJobRunner` (тот самый TaskGroup-вариант). API-контракт не меняется. `JOBS_BACKEND=arq` — production-режим (default).

Это полезно только разработчикам, которые не хотят запускать redis локально для быстрых проверок. **В CI и в production — только `arq`.**

## 6. Эндпоинты

### `POST /api/v1/classify/batch`

Запуск массовой классификации.

```json
{
  "items": [
    {"description": "Электрическая зубная щётка Oral-B", "additional_info": {}},
    {"description": "Кофемолка ручная керамическая", "additional_info": {}}
  ],
  "mode": "auto"             // "auto" | "sync" | "async"
}
```

**Логика выбора режима:**
- `mode=sync`: обработка через `asyncio.gather`, ответ синхронно. Запрещено если `len(items) > BATCH_SYNC_MAX` (default 5).
- `mode=async`: всегда async, отдаёт `job_id`.
- `mode=auto`: sync если N ≤ `BATCH_SYNC_MAX`, иначе async.

**Sync-ответ (200):**
```json
{
  "results": [
    {"position": 0, "status": "completed", "result": {...}, "session_id": null},
    {"position": 1, "status": "needs_input", "session_id": "...", "partial": {...}}
  ]
}
```

**Async-ответ (202 Accepted):**
```json
{
  "job_id": "cls_a1b2c3...",
  "status": "pending",
  "total_items": 30,
  "poll_url": "/api/v1/jobs/cls_a1b2c3.../status",
  "events_url": "/api/v1/jobs/cls_a1b2c3.../events"
}
```

### `GET /api/v1/jobs/{job_id}`

Метаданные job'а + краткая агрегация.

```json
{
  "job_id": "cls_a1b2c3...",
  "job_type": "classify_batch",
  "status": "running",
  "progress": {
    "total": 30,
    "completed": 12,
    "failed": 1,
    "needs_input": 2,
    "running": 8,
    "pending": 7
  },
  "parent_ocr_job_id": "ocr_x1y2z3...",
  "created_at": "...",
  "started_at": "...",
  "completed_at": null
}
```

### `GET /api/v1/jobs/{job_id}/items`

Список item'ов с фильтрами `?status=needs_input`, `?status=failed`. Пагинация при больших job'ах.

```json
{
  "items": [
    {
      "item_id": "...",
      "position": 0,
      "status": "completed",
      "product_description": "...",
      "result": { "final_code": "8509800000", ... },
      "source_ref": {"ocr_line_number": 1}
    },
    {
      "item_id": "...",
      "position": 5,
      "status": "needs_input",
      "session_id": "...",
      "partial": {
        "partial_code": "8509",
        "missing_parameters": ["мощность"],
        "questions": ["Укажите: мощность"]
      }
    }
  ],
  "next_cursor": null
}
```

### `POST /api/v1/jobs/{job_id}/items/{item_id}/answer`

Ответ на уточнение для одного item'а.

```json
{
  "answers": {"мощность": "1.5 кВт"}
}
```

**Сервер:**
1. Достаёт `classification_session_id` из item'а.
2. Делегирует `orchestrator.resume(session_id, answers)`.
3. По результату обновляет item: `completed` / `needs_input` (если снова) / `failed`.
4. Пересчитывает агрегаты job'а (триггер на `INSERT/UPDATE classification_job_items` или из application-кода).

Можно отвечать **по одному item'у за раз** (UI разворачивает только нужный), либо **батчем** через `POST /api/v1/jobs/{job_id}/answers`:
```json
{
  "answers": [
    {"item_id": "...", "answers": {"мощность": "1.5 кВт"}},
    {"item_id": "...", "answers": {"материал": "хлопок 100%"}}
  ]
}
```
— рекомендуем батч; UI собирает ответы для всех «зависших» позиций и отправляет одним запросом.

### `DELETE /api/v1/jobs/{job_id}`

Отмена job'а. Что происходит:
- В БД: `status='cancelled'`, всем `pending`-item'ам — `cancelled`.
- В runner'е: `tg.cancel()` для активной TaskGroup. Уже `running` LLM-вызовы доходят до конца (cancel не убивает HTTP-запросы внутри semaphore без специальной обвязки) — это допустимо для MVP. P2 — поддержать `asyncio.CancelledError` корректно.

### `GET /api/v1/jobs/{job_id}/events` *(SSE)*

Server-Sent Events для real-time прогресса. Альтернатива polling'у.

```
event: progress
data: {"completed": 13, "running": 7}

event: item_done
data: {"item_id": "...", "position": 4, "status": "completed", "final_code": "8509800000"}

event: item_needs_input
data: {"item_id": "...", "position": 5, "session_id": "...", "questions": ["..."]}

event: finished
data: {"status": "needs_input", "summary": {...}}
```

**Реализация:**
- Sourсе событий: таблица `classification_job_events` (LISTEN/NOTIFY PostgreSQL) либо in-process pub/sub (для single-instance MVP).
- Heartbeat каждые 15 секунд (`event: ping`) — чтобы proxy/балансировщик не закрывал соединение.
- Закрытие потока, когда `status` стал терминальным.

**Альтернатива SSE:** WebSocket. Выбор — SSE проще (одностороннее), достаточно для прогресса; WS избыточен.

## 7. Цепочка OCR → Classify

`POST /api/v1/ocr/jobs?auto_classify=true&mode=async` создаёт **два связанных job'а**:
1. `ocr_jobs.id = ocr_X` — OCR + splitter (энкьюится `run_ocr_job` в arq).
2. `classification_jobs.id = cls_Y` (статус `pending`, `total_items=0`, `parent_ocr_job_id=ocr_X`) — placeholder.

После завершения OCR-job'а (status='completed') арq-таск `run_ocr_split_and_enqueue`:
1. Берёт `result.products` (массив `ProductCard`).
2. Создаёт `classification_job_items` для каждого продукта (status='pending').
3. Обновляет `classification_jobs.total_items` и переводит в `running`.
4. Энкьюит `run_classify_batch(cls_Y)` — далее по обычному батч-пайплайну (§5.3).

Фронтенд получает `cls_Y` сразу при создании OCR-job'а и может начинать polling. Пока OCR не завершён — `cls_Y.status='pending'`, `total_items=0`. После — статус начнёт меняться.

**Альтернатива:** пользователь после OCR смотрит результат, *вручную редактирует* список продуктов, и только потом запускает batch (`POST /api/v1/classify/batch` с явными items). Это P1-сценарий — меньше «магии», больше контроля. Делаем оба пути:
- `auto_classify=true` — для пользователей, которые доверяют OCR.
- `auto_classify=false` — для требовательных, которые проверяют split вручную.

## 8. Конфигурация

### Redis / воркеры

| Переменная | Описание | Default |
|---|---|---|
| `REDIS_URL` | DSN Redis для arq и pub/sub | `redis://redis:6379/0` |
| `JOBS_BACKEND` | `arq` (production) или `inprocess` (local dev) | `arq` |
| `WORKER_REPLICAS` | Количество воркер-контейнеров (compose scale) | `2` |
| `WORKER_MAX_JOBS` | Макс. одновременных тасков в одном воркере (`max_jobs` arq) | `16` |
| `WORKER_JOB_TIMEOUT_S` | Hard-timeout одного арq-таска | `3600` |
| `WORKER_MAX_TRIES` | Макс. попыток для упавшего таска (item) | `1` |
| `WORKER_HEALTH_CHECK_S` | Интервал arq health-check | `30` |

### Конкурентность LLM

| Переменная | Описание | Default |
|---|---|---|
| `LLM_MAX_CONCURRENT` | Per-process semaphore (внутри одного воркера или app) | `8` |
| `LLM_RATE_LIMIT_PER_MIN` | RPM-бюджет на ключ OpenRouter (`0` = без лимита) | `0` |
| `LLM_RATE_LIMITER_BACKEND` | `local` (per-process) / `redis` (распределённый) | `local` |

### Лимиты batch и TTL

| Переменная | Описание | Default |
|---|---|---|
| `BATCH_SYNC_MAX` | Макс. items в `mode=sync` (без очереди) | `5` |
| `BATCH_ASYNC_MAX_ITEMS` | Жёсткий лимит размера batch (защита от DoS) | `200` |
| `JOB_RESULT_TTL_HOURS` | TTL хранения завершённых job'ов в Postgres | `72` |
| `JOB_EVENTS_RETENTION_HOURS` | TTL таблицы событий | `24` |
| `STUCK_ITEMS_RESET_AFTER_S` | После какого «тишины» в running item возвращается в pending | `900` |
| `SSE_HEARTBEAT_S` | Интервал heartbeat в SSE | `15` |

## 9. Тонкие места и решения

### 9.1. needs_input в батче — не блокировать остальные

Каждый item внутри `TaskGroup` обрабатывается независимо. Если `orchestrator.classify` завершился со статусом `needs_input`:
- Item сохраняется как `status='needs_input'`, ссылается на `classification_session_id`.
- Это **не** исключение — `_run_item` штатно завершается успехом.
- Job в целом дойдёт до состояния, где все items терминальны (для зависших — `needs_input`). Тогда job → `needs_input`. Когда юзер ответит на все — пересчитывается.

### 9.2. Что делать с item'ами, которые по timeout'у LLM упали

- В `OpenRouterProvider` уже есть retry-логика. Если все retry исчерпаны — `_run_item` ловит исключение, помечает `failed`, кладёт в `error` текст ошибки.
- Job не падает. UI показывает количество failed и предлагает retry конкретных позиций.

### 9.3. Retry упавших item'ов

`POST /api/v1/jobs/{job_id}/retry-failed` — создаёт новый job (или возрождает item'ы в текущем — на выбор). Рекомендация: **новый job** с `parent_job_id` ссылкой — иммутабельность результатов важнее экономии записей.

### 9.4. Конкурентность в самом каскаде одного item'а

Внутри одного каскада уровни строго последовательны (L1 нужен для L2). Нет смысла параллелить *внутри* item'а (разве что L3 shortlist+deep — но это уже сделано как один последовательный flow).

Где ещё внутри *одного* запроса есть smysl от concurrency:
- L1 shortlist возвращает 2 кандидата → их верификация (L1b) **могла бы** идти параллельно. Сейчас sequence — оставляем как есть, преждевременная оптимизация.
- NTM verifier: проверка нескольких мер для одного кода — можно в `asyncio.gather` (если ещё не сделано).

### 9.5. Backpressure при очень больших batch'ах

`BATCH_ASYNC_MAX_ITEMS=200` — пользователь не сможет загрузить инвойс на 1000 строк одним job'ом. Если такой кейс возникнет — разбиваем на несколько job'ов (с UI warning).

В очереди arq никаких 200 одновременных корутин не возникает: fan-out порождает 200 enqueue'ев, но реально в работе одновременно — `WORKER_REPLICAS × WORKER_MAX_JOBS` (например, 2 × 16 = 32). Остальные ждут в очереди Redis.

### 9.6. Слои конкурентности (полная картина)

```
N items в job'е           ──►  лежат в Postgres (статус pending)
                                       │
arq-очередь Redis         ──►  N enqueue'ев висят в очереди
                                       │
WORKER_REPLICAS × MAX_JOBS ──►  одновременно «в работе» у воркеров (item-уровень)
                                       │
LLM_MAX_CONCURRENT (per-proc)──► одновременно в OpenRouter из одного воркера
                                       │
LLM_RATE_LIMIT_PER_MIN     ──►  глобальный RPM-бюджет (если включён)
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                         OpenRouter         Postgres
                        (rate-limit)        (writes)
```

Узкое место — обычно последний слой (rate-limit OpenRouter). Подбираем `WORKER_REPLICAS × LLM_MAX_CONCURRENT ≈ N RPM / avg_seconds_per_call`.

### 9.7. Прогресс на уровне каскада (опционально, P2)

Сейчас фронт видит «item completed/running/failed». Если нужно показывать «item на L3 из 6 уровней» — добавляем в `classification_job_items.progress JSONB` поле `current_level`, обновляем после каждого `level.run()` через коллбэк, который пробрасывается в `Orchestrator`. Воркер дополнительно публикует событие в `redis.publish(f"job:{job_id}", ...)`.

Это требует изменения `CascadeOrchestrator.classify` — принимать опциональный `on_progress: Callable[[int, str], Awaitable[None]]`. Реализуем только если UX-исследования покажут необходимость.

### 9.8. Изоляция БД-сессий

Каждый item открывает **свою** `AsyncSession` через `db_session_factory` из `ctx`. Никогда не переиспользуем `AsyncSession` между арq-задачами — соединение возвращается в pool после `async with`.

В `on_startup` арq-воркера создаём один `async_sessionmaker` и кладём в `ctx`:

```python
async def on_worker_startup(ctx: dict) -> None:
    ctx["db_engine"] = create_async_engine(settings.DATABASE_URL, pool_size=10)
    ctx["db_session_factory"] = async_sessionmaker(ctx["db_engine"], expire_on_commit=False)
    ctx["llm_semaphore"] = asyncio.Semaphore(settings.LLM_MAX_CONCURRENT)
    ctx["orchestrator"] = CascadeOrchestrator()
    ctx["llm_rate_limiter"] = build_rate_limiter(ctx["redis"], settings)
```

### 9.9. Graceful shutdown воркеров

arq уважает `SIGTERM` — даёт активным таскам доработать (до `WORKER_JOB_TIMEOUT_S`). В Docker/k8s выставляем `terminationGracePeriodSeconds` ≥ типичной длительности item'а × 2 (для каскада: 60–120 секунд).

Если воркер всё-таки убит жёстко — `STUCK_ITEMS_RESET_AFTER_S` cron вернёт зависший item в очередь.

## 10. Scale-out path

С первого дня deploy выглядит так:

| Компонент | min-prod | стандартный prod | high-load |
|---|---|---|---|
| `app` (FastAPI) | 1 | 2 (за nginx/traefik) | 4+ |
| `worker` (arq) | 1 | 2 | 4–10 |
| `redis` | 1 | 1 (managed) | 1 master + replica |
| `postgres` | 1 | 1 (managed) | 1 + read-replica для `/tnved/lookup` |

Масштабирование — горизонтальное, увеличиваем `WORKER_REPLICAS`. Никакого реструктурирования кода для этого не нужно — это и есть выигрыш от arq с первого дня.

**Когда понадобится менять архитектуру:**
- Один OpenRouter-ключ упёрся в RPM при `WORKER_REPLICAS=10` → разделить ключи на пулы (несколько `OPENROUTER_API_KEY_*`, round-robin внутри `OpenRouterProvider`).
- Postgres write-bottleneck → шардировать `classification_job_events` (или вообще выкинуть, оставив только Redis pub/sub для live).
- Нужен SLA на latency запуска item'а → отдельная high-priority очередь арq (`queue_name`), отдельные воркеры на ней.

Эти изменения локальны и не требуют переписывания основной логики.

## 11. Уборка и TTL

Cron-функции внутри `WorkerSettings.cron_jobs` (arq нативно поддерживает расписания):

```python
cron_jobs = [
    cron(cleanup_expired_jobs, hour=None, minute=0),     # каждый час
    cron(cleanup_expired_events, hour=None, minute=15),
    cron(cleanup_orphan_sessions, hour=None, minute=30),
    cron(reset_stuck_items, hour=None, minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55}),  # каждые 5 минут
]
```

Что делают:
- `cleanup_expired_jobs` — `DELETE FROM classification_jobs WHERE expires_at < NOW()` (каскадно удалит items).
- `cleanup_expired_events` — `DELETE FROM classification_job_events WHERE created_at < NOW() - JOB_EVENTS_RETENTION_HOURS`.
- `cleanup_orphan_sessions` — `DELETE FROM classification_sessions WHERE updated_at < NOW() - SESSION_TTL_MINUTES * 4`.
- `reset_stuck_items` — см. §5.6 (возврат «зависших» running items в pending).

Ничего не нужно отдельно поднимать (apscheduler/cron-контейнер) — арq-воркер сам выполняет cron-задачи между обычными тасками. Если воркеров несколько — арq сам гарантирует, что cron-задача отработает один раз (через Redis-lock).

## 12. Тесты

arq-задачи — обычные `async def` функции; тестируются как unit без поднятия Redis (передаём в `ctx` mock'и). Полный stack — через `arq.testing.TestRedis` или поднятый `redis:7-alpine` в pytest-fixtures.

| Уровень | Что покрываем |
|---|---|
| unit (`tests/jobs/test_tasks.py`) | вызов `run_classify_item(ctx, item_id)` напрямую с mock-orchestrator; проверка переходов статусов и публикации событий |
| unit (`tests/jobs/test_state_machine.py`) | агрегация item-статусов в job-статус; атомарность финализации (race) |
| unit (`tests/jobs/test_rate_limiter.py`) | поведение `RedisSlidingWindowLimiter` (с `fakeredis`) |
| integration (`tests/jobs/test_batch_endpoint.py`) | POST `/classify/batch` sync/async — проверка строк в БД и факта enqueue в Redis |
| integration (`tests/jobs/test_full_pipeline.py`) | реальный воркер (`arq.Worker.async_run`) + Redis в docker-compose-test → POST batch → polling → проверка результатов |
| integration (`tests/jobs/test_resume_in_batch.py`) | item с needs_input → POST answer → item completed → пересчёт агрегатов |
| integration (`tests/jobs/test_stuck_recovery.py`) | искусственно ставим item.status='running', крутим `reset_stuck_items` → возвращается в pending → подхватывается |
| stress (опц.) | 200 items × разная сложность; проверка respect rate-limit, что воркеры не падают |

## 13. Метрики

Бизнес-метрики (Prometheus, экспортируем из app и worker):
- `jobs_total{type, status}` — counter;
- `job_duration_seconds{type}` — histogram;
- `job_items_total{job_type, status}` — counter;
- `llm_concurrency_in_use{worker_id}` — gauge (текущее число удерживаемых семафор-слотов);
- `llm_rate_limit_wait_seconds` — histogram (сколько ждали глобальный лимитер);
- `llm_call_duration_seconds{level, model}` — histogram;
- `stuck_items_reset_total` — counter (сколько item'ов вернули из running в pending).

Инфраструктурные метрики:
- arq встроенные — длина очереди, активные таски, retry'и, неудачи (`arq` отдаёт через свой stats endpoint, либо собираем сами через `redis.zcard` для очередей);
- redis: память, hit/miss, replication lag (если есть replica) — стандартный `redis_exporter`;
- postgres: connection pool usage, `pg_stat_activity` — `postgres_exporter`.

Для дашборда: Grafana с панелями «Live load» (LLM concurrency, queue length), «Throughput» (items/min), «Errors» (failed items, OpenRouter 5xx), «Latency» (p50/p95/p99 длительности item).

## 14. Безопасность

- **Авторизация на job'ы.** Когда появится auth — `classification_jobs.owner_user_id`; список и `GET /jobs/{id}` должны фильтровать по владельцу.
- **DoS protection.** `BATCH_ASYNC_MAX_ITEMS`, лимит размера запроса (`POST /classify/batch`), per-IP rate-limit на создание job'ов.
- **Не логировать full product descriptions** в `classification_job_events` — можно содержать чувствительные данные клиента.

## 15. Migration plan (для существующего кода)

1. **Инфраструктура:** добавить `redis:7-alpine` и сервис `worker` в `docker-compose.yml`. Документация в README по REDIS_URL.
2. **БД:** миграция 008 — `classification_jobs`, `classification_job_items`, `classification_job_events`.
3. **Зависимости:** добавить `arq>=0.26` в `pyproject.toml`.
4. **Расширить `OpenRouterProvider`** — встроенный per-process семафор (`asyncio.Semaphore(LLM_MAX_CONCURRENT)`) и опциональный rate-limiter. Прозрачно для всех вызовов (sync `/classify` и арq-таски одинаково).
5. **Модуль `feap/jobs/`:**
   - `tasks.py` — арq-функции (`run_classify_batch`, `run_classify_item`, `run_ocr_job`, `run_ocr_split_and_enqueue`);
   - `worker.py` — `WorkerSettings` для `arq` CLI;
   - `repository.py` — Postgres-операции с jobs/items/events (load_pending_item_ids, mark_*, update_job_aggregates);
   - `enqueue.py` — высокоуровневый интерфейс для FastAPI (`enqueue_classify_batch(redis, job_id)`);
   - `events.py` — публикация и подписка на `redis.pubsub` для SSE;
   - `cron.py` — cleanup-функции.
6. **DI в FastAPI:** инициализация `arq.create_pool` в lifespan, доступ через `Depends(get_arq_pool)`.
7. **Эндпоинты:** `/classify/batch`, `/jobs/{id}`, `/jobs/{id}/items`, `/jobs/{id}/events` (SSE), `/jobs/{id}/answers`, `/jobs/{id}` DELETE.
8. **Не трогать** `/classify` и `/classify/{session_id}/answer` — они работают как раньше для single-product flow.
9. **Recovery:** `STUCK_ITEMS_RESET_AFTER_S` cron-задача в воркере. Никакого `@app.on_event("startup")` recovery — арq-механика это решает.
10. **Тесты:** unit (mock ctx) + integration (docker-compose c redis в CI).

Никаких breaking changes для существующего фронтенда single-product flow. Воркер запускается отдельным контейнером, и app может работать **без** воркера для smoke-тестов single-product (с `JOBS_BACKEND=inprocess`).

## 16. Открытые вопросы

1. **SSE vs polling:** оба поддержим. Default — SSE через Redis pub/sub (быстро, дёшево). Polling-fallback на 5 секундах включается флагом `VITE_SSE_ENABLED=false` на фронте — для corporate proxy, режущих long-lived соединения.
2. **Идемпотентность создания batch'а.** Если фронт случайно дважды нажал «Submit» — создаём 2 job'а или находим существующий по hash payload? Рекомендуем заголовок `Idempotency-Key` (как у Stripe), фронт генерит UUID на форму. Серверная сторона: ключ хранится в Redis с TTL 1 час, на повторный POST с тем же ключом — возвращаем уже созданный `job_id`.
3. **Очереди по приоритетам.** Single-product через арq (для unification) или оставить sync? Решение: **оставить `/classify` sync** (мгновенный путь), очередь — только для batch. Если в будущем нужны разные приоритеты внутри batch (платящий клиент быстрее) — добавим `queue_name='premium'` отдельно.
4. **Управляемый Redis vs self-hosted.** На MVP — self-hosted в docker-compose. Для production — managed (Yandex Cloud Managed Redis / AWS ElastiCache / Upstash). Прозрачно меняется через `REDIS_URL`.
5. **Цена.** Считать стоимость job'а (на основе LLM usage из OpenRouter response.usage) и показывать в UI — отдельная задача. Метрика `job_cost_usd` в JSONB-колонке `cost` у `classification_jobs`.
6. **Отзывы пользователей** на классификацию (правильно/неправильно) — должны привязываться к `item_id` для будущих fine-tune датасетов; вне scope текущего ТЗ, но `item_id` нужно держать стабильным (не пересоздавать при retry).
