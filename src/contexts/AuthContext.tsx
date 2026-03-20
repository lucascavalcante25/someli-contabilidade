import React, { createContext, useContext, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

interface User {
  id?: number;
  nome: string;
  cpf: string;
  perfil: string;
  fotoUrl?: string;
  /** Usado internamente para forçar refresh do avatar no header */
  _avatarVersion?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (cpf: string, senha: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<Pick<User, 'nome' | 'fotoUrl'>>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = API_BASE_URL;

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('someli_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      localStorage.removeItem('someli_user');
      return null;
    }
  });

  const login = useCallback(async (cpf: string, senha: string) => {
    try {
      const cpfApenasNumeros = cpf.replace(/\D/g, '');
      const response = await apiFetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cpf: cpfApenasNumeros,
          senha,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.warn('Login falhou:', response.status, err?.message || response.statusText);
        return false;
      }

      const data = await response.json();
      const usuario = data?.usuario;
      const token = data?.token;
      if (!usuario || !token) {
        return false;
      }

      const u: User = {
        id: usuario.id,
        nome: usuario.nome,
        cpf: usuario.cpf,
        perfil: usuario.perfil,
        fotoUrl: usuario.fotoUrl,
      };
      setUser(u);
      localStorage.setItem('someli_user', JSON.stringify(u));
      localStorage.setItem('someli_token', token);
      return true;
    } catch {
      return false;
    }
  }, [apiBaseUrl]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('someli_user');
    localStorage.removeItem('someli_token');
  }, []);

  const updateUser = useCallback((updates: Partial<Pick<User, 'nome' | 'fotoUrl'>>) => {
    setUser(prev => {
      if (!prev) return null;
      const next: User = {
        ...prev,
        ...updates,
        _avatarVersion: Date.now(),
      };
      localStorage.setItem('someli_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
