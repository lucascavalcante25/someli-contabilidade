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
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('someli_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (cpf: string, _senha: string) => {
    // Mock login
    if (cpf === '111.222.333-44' || cpf === '11122233344') {
      const u: User = { nome: 'Administrador SOMELI', cpf: '111.222.333-44', perfil: 'ADMIN' };
      setUser(u);
      localStorage.setItem('someli_user', JSON.stringify(u));
      localStorage.setItem('someli_token', 'mock-jwt-token');
      return true;
    }
    return false;
  }, []);

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
