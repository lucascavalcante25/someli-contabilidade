const envApiUrl = (import.meta.env.VITE_API_URL || "").trim();

/** Fallback de produção caso a env não esteja configurada no build (ex.: Vercel). */
const PRODUCTION_API_URL = "https://someli-contabilidade.duckdns.org";

export const API_BASE_URL =
  envApiUrl || (import.meta.env.DEV ? "http://localhost:8081" : PRODUCTION_API_URL);

if (!envApiUrl && !import.meta.env.DEV) {
  console.warn("VITE_API_URL ausente no build; usando fallback:", PRODUCTION_API_URL);
}
