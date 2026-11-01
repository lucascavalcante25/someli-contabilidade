/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Desativado por padrão — import XML NFe/NFSe na UI do cliente. */
  readonly VITE_ENABLE_XML_IMPORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
