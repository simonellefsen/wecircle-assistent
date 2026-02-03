/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANALYZE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
