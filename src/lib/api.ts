const envApiUrl = (import.meta.env.VITE_API_URL || "").trim();

export const API_BASE_URL =
  envApiUrl || (import.meta.env.DEV ? "http://localhost:8080" : "");

if (!API_BASE_URL && !import.meta.env.DEV) {
  // Production should always set VITE_API_URL.
  console.error("VITE_API_URL não configurada no ambiente de produção.");
}
