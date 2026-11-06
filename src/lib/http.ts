const TOKEN_KEY = "someli_token";
const USER_KEY = "someli_user";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

let redirectingToLogin = false;

function redirectToLogin() {
  if (redirectingToLogin) return;
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  redirectingToLogin = true;
  clearAuthSession();
  window.location.assign("/login");
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  opcoes: { manterNo403?: boolean } = {},
) {
  const headers = new Headers(init.headers ?? {});
  const token = getAuthToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  // 401 encerra a sessão. 403 de permissão pode ser tratado na tela (manterNo403).
  const encerrarSessao = response.status === 401 || (response.status === 403 && !opcoes.manterNo403);
  if (encerrarSessao) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : "";
    const isAuthPublic =
      url.includes("/auth/login") ||
      url.includes("/auth/preview") ||
      url.includes("/auth/avatar") ||
      url.includes("/someli/api/");

    if (!isAuthPublic && token) {
      redirectToLogin();
    }
  }

  return response;
}
