import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'someli_valores_visiveis';

type ValoresVisibilidadeContextType = {
  visiveis: boolean;
  toggle: () => void;
  setVisiveis: (v: boolean) => void;
  mascarar: (valorFormatado: string) => string;
};

const ValoresVisibilidadeContext = createContext<ValoresVisibilidadeContextType | null>(null);

export function ValoresVisibilidadeProvider({ children }: { children: ReactNode }) {
  const [visiveis, setVisiveisState] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === '0') setVisiveisState(false);
      if (raw === '1') setVisiveisState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setVisiveis = useCallback((v: boolean) => {
    setVisiveisState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setVisiveisState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const mascarar = useCallback(
    (valorFormatado: string) => (visiveis ? valorFormatado : 'R$ ••••••'),
    [visiveis]
  );

  const value = useMemo(
    () => ({ visiveis, toggle, setVisiveis, mascarar }),
    [visiveis, toggle, setVisiveis, mascarar]
  );

  return (
    <ValoresVisibilidadeContext.Provider value={value}>
      {children}
    </ValoresVisibilidadeContext.Provider>
  );
}

export function useValoresVisibilidade() {
  const ctx = useContext(ValoresVisibilidadeContext);
  if (!ctx) {
    return {
      visiveis: true,
      toggle: () => undefined,
      setVisiveis: () => undefined,
      mascarar: (v: string) => v,
    };
  }
  return ctx;
}
