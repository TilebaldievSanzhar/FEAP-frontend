/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SSE_ENABLED?: string;
  readonly VITE_SSE_HEARTBEAT_TIMEOUT_MS?: string;
  readonly VITE_OCR_MAX_FILE_MB?: string;
  readonly VITE_BATCH_SYNC_MAX?: string;
  readonly VITE_DEFAULT_LOCALE?: string;
  readonly VITE_BUILD_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
