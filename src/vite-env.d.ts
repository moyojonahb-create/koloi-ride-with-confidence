/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DD_RUM_ENABLED?: string;
  readonly VITE_DD_RUM_APPLICATION_ID?: string;
  readonly VITE_DD_RUM_CLIENT_TOKEN?: string;
  readonly VITE_DD_RUM_SITE?: string;
  readonly VITE_DD_RUM_SERVICE?: string;
  readonly VITE_DD_RUM_ENV?: string;
  readonly VITE_DD_RUM_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
