import { useEffect, useState } from 'react';
import { carregarFeriados, feriadosLocais, type MapaFeriados } from '@/lib/feriados';

/**
 * Feriados do ano da data (e dos anos vizinhos, para a virada de ano).
 * Começa com a lista local para o calendário já marcar os feriados enquanto a BrasilAPI responde.
 */
export function useFeriados(dataIso?: string): MapaFeriados {
  const ano = dataIso && /^\d{4}-/.test(dataIso) ? Number(dataIso.slice(0, 4)) : new Date().getFullYear();
  const [mapa, setMapa] = useState<MapaFeriados>(() => ({
    ...feriadosLocais(ano - 1),
    ...feriadosLocais(ano),
    ...feriadosLocais(ano + 1),
  }));

  useEffect(() => {
    let ativo = true;
    Promise.all([carregarFeriados(ano - 1), carregarFeriados(ano), carregarFeriados(ano + 1)]).then((listas) => {
      if (ativo) setMapa(Object.assign({}, ...listas));
    });
    return () => {
      ativo = false;
    };
  }, [ano]);

  return mapa;
}
