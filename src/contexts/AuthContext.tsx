import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { canAccessModule, hasPermission } from '@/lib/permissions';

interface User {
  id?: number;
  nome: string;
  cpf: string;
  perfil: string;
  email?: string;
  telefone?: string;
  fotoUrl?: string;
  _avatarVersion?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  permissoes: string[];
  alcadaGlobal: boolean;
  login: (cpf: string, senha: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<Pick<User, 'nome' | 'fotoUrl' | 'email' | 'telefone'>>) => void;
  can: (codigo: string) => boolean;
  canModule: (modulo: string) => boolean;
  refreshPermissoes: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PERMS_KEY = 'someli_permissoes';
const ALCADA_KEY = 'someli_alcada_global';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = API_BASE_URL;

  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('someli_token');
    const stored = localStorage.getItem('someli_user');
    if (!token || !stored) {
      localStorage.removeItem('someli_user');
      localStorage.removeItem('someli_token');
      return null;
    }
    try {
      return JSON.parse(stored) as User;
    } catch {
      localStorage.removeItem('someli_user');
      localStorage.removeItem('someli_token');
      return null;
    }
  });

  const [permissoes, setPermissoes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(PERMS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [alcadaGlobal, setAlcadaGlobal] = useState(() => localStorage.getItem(ALCADA_KEY) === 'true');

  const persistPerms = (perms: string[], global: boolean) => {
    setPermissoes(perms);
    setAlcadaGlobal(global);
    localStorage.setItem(PERMS_KEY, JSON.stringify(perms));
    localStorage.setItem(ALCADA_KEY, String(global));
  };

  const refreshPermissoes = useCallback(async () => {
    const token = localStorage.getItem('someli_token');
    if (!token) return;
    try {
      const res = await apiFetch(`${apiBaseUrl}/permissoes/me`);
      if (!res.ok) return;
      const data = await res.json();
      persistPerms(data.permissoes || [], !!data.alcadaGlobal);
    } catch {
      /* ignore */
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (user) {
      void refreshPermissoes();
    }
  }, [user?.id, refreshPermissoes]);

  const login = useCallback(async (cpf: string, senha: string) => {
    try {
      const cpfApenasNumeros = cpf.replace(/\D/g, '');
      const response = await apiFetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpfApenasNumeros, senha }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      const usuario = data?.usuario;
      const token = data?.token;
      if (!usuario || !token) return false;

      const u: User = {
        id: usuario.id,
        nome: usuario.nome,
        cpf: usuario.cpf,
        perfil: usuario.perfil,
        email: usuario.email,
        telefone: usuario.telefone,
        fotoUrl: usuario.fotoUrl,
      };
      setUser(u);
      localStorage.setItem('someli_user', JSON.stringify(u));
      localStorage.setItem('someli_token', token);
      persistPerms(data.permissoes || [], !!data.alcadaGlobal);
      return true;
    } catch {
      return false;
    }
  }, [apiBaseUrl]);

  const logout = useCallback(() => {
    setUser(null);
    persistPerms([], false);
    localStorage.removeItem('someli_user');
    localStorage.removeItem('someli_token');
    localStorage.removeItem(PERMS_KEY);
    localStorage.removeItem(ALCADA_KEY);
  }, []);

  const updateUser = useCallback((updates: Partial<Pick<User, 'nome' | 'fotoUrl' | 'email' | 'telefone'>>) => {
    setUser(prev => {
      if (!prev) return null;
      const next: User = { ...prev, ...updates, _avatarVersion: Date.now() };
      localStorage.setItem('someli_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const can = useCallback((codigo: string) => hasPermission(permissoes, codigo), [permissoes]);
  const canModule = useCallback((modulo: string) => canAccessModule(permissoes, modulo), [permissoes]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      permissoes,
      alcadaGlobal,
      login,
      logout,
      updateUser,
      can,
      canModule,
      refreshPermissoes,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
