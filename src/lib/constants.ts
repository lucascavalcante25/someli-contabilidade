export const PAGE_SIZE = 30;

/**
 * Import XML NFe/NFSe — desativado até demanda do escritório.
 * Reativar: VITE_ENABLE_XML_IMPORT=true no .env (ou altere o default abaixo).
 * Backend (parser/rota/migration) permanece intacto.
 */
export const ENABLE_XML_IMPORT =
  String(import.meta.env.VITE_ENABLE_XML_IMPORT ?? 'false').toLowerCase() === 'true';
