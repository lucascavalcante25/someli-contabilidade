import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

/**
 * Feriados nacionais e ajuste de vencimento para dia útil.
 * Mesma regra do backend (DiaUtilService): Pessoal antecipa, as demais áreas prorrogam.
 * Quem grava a data ajustada é o servidor; aqui é só o aviso no calendário.
 */

/** Data ISO (yyyy-MM-dd) → nome do feriado. */
export type MapaFeriados = Record<string, string>;

const cache = new Map<number, MapaFeriados>();

export function limparCacheFeriados() {
  cache.clear();
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const deIso = (s: string) => {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
};

/** Domingo de Páscoa (Meeus/Jones/Butcher), igual ao FeriadosNacionaisFixos do backend. */
function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/** Reserva para quando a BrasilAPI não responde. */
export function feriadosLocais(ano: number): MapaFeriados {
  const sexta = pascoa(ano);
  sexta.setDate(sexta.getDate() - 2);
  const mapa: MapaFeriados = {
    [`${ano}-01-01`]: 'Confraternização mundial',
    [iso(sexta)]: 'Sexta-feira Santa',
    [`${ano}-04-21`]: 'Tiradentes',
    [`${ano}-05-01`]: 'Dia do trabalho',
    [`${ano}-09-07`]: 'Independência do Brasil',
    [`${ano}-10-12`]: 'Nossa Senhora Aparecida',
    [`${ano}-11-02`]: 'Finados',
    [`${ano}-11-15`]: 'Proclamação da República',
    [`${ano}-12-25`]: 'Natal',
  };
  if (ano >= 2024) mapa[`${ano}-11-20`] = 'Dia da Consciência Negra';
  return mapa;
}

export async function carregarFeriados(ano: number): Promise<MapaFeriados> {
  const emCache = cache.get(ano);
  if (emCache) return emCache;
  try {
    const res = await apiFetch(`${API_BASE_URL}/integracoes/feriados/${ano}`);
    if (!res.ok) return feriadosLocais(ano);
    const lista: unknown = await res.json();
    const mapa: MapaFeriados = {};
    if (Array.isArray(lista)) {
      for (const f of lista) {
        if (f && typeof f === 'object' && typeof f.date === 'string') {
          mapa[f.date] = typeof f.name === 'string' && f.name ? f.name : 'Feriado';
        }
      }
    }
    if (Object.keys(mapa).length === 0) return feriadosLocais(ano);
    cache.set(ano, mapa);
    return mapa;
  } catch {
    return feriadosLocais(ano);
  }
}

export function antecipaPorTipo(tipoOuSetor: string | null | undefined): boolean {
  return tipoOuSetor === 'PESSOAL' || tipoOuSetor === 'DEPARTAMENTO_PESSOAL';
}

/** Regra para o aviso do calendário quando várias obrigações usam a mesma data. */
export function regraDosTipos(tipos: (string | null | undefined)[]): boolean | 'misto' {
  const pessoal = tipos.filter(antecipaPorTipo).length;
  if (pessoal === 0) return false;
  return pessoal === tipos.length ? true : 'misto';
}

const NOME_DIA =['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Motivo de o dia não ser útil, ou null se é dia útil. */
export function motivoNaoUtil(data: string, feriados: MapaFeriados): string | null {
  const d = deIso(data);
  const ddmm = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  if (feriados[data]) return `${ddmm} é feriado (${feriados[data]})`;
  if (d.getDay() === 0 || d.getDay() === 6) return `${ddmm} é ${NOME_DIA[d.getDay()]}`;
  return null;
}

export function ajusteDiaUtil(data: string, antecipa: boolean, feriados: MapaFeriados): { data: string; motivo: string | null } {
  const motivo = motivoNaoUtil(data, feriados);
  if (!motivo) return { data, motivo: null };
  const d = deIso(data);
  for (let i = 0; i < 15 && motivoNaoUtil(iso(d), feriados); i++) {
    d.setDate(d.getDate() + (antecipa ? -1 : 1));
  }
  return { data: iso(d), motivo };
}
