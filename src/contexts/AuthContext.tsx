import React, { createContext, useContext, useState, useCallback } from 'react';

interface User {
  nome: string;
  cpf: string;
  perfil: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (cpf: string, senha: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
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
        return false;
      }

      const data = await response.json();
      const usuario = data?.usuario;
      const token = data?.token;
      if (!usuario || !token) {
        return false;
      }

      const u: User = {
        nome: usuario.nome,
        cpf: usuario.cpf,
        perfil: usuario.perfil,
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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
