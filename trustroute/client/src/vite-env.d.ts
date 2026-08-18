/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute URL of the deployed backend, e.g. https://trustroute-backend.onrender.com */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}