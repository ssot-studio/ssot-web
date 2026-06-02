/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** SSOT 데이터 마운트 경로 (BASE_URL 기준 상대). 기본 '/ssot'. */
  readonly VITE_SSOT_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
