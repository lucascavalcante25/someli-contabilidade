import type { TipoDataEspecial } from '@/lib/datasEspeciais';

/** Cor de cada tipo: a mesma no calendário, na legenda e na lista. */
export const COR_TIPO: Record<TipoDataEspecial, { ponto: string; icone: string }> = {
  ANIVERSARIO_RESPONSAVEL: { ponto: 'bg-pink-500', icone: 'text-pink-600 dark:text-pink-400' },
  ANIVERSARIO_EMPRESA: { ponto: 'bg-amber-500', icone: 'text-amber-600 dark:text-amber-400' },
  DIA_PROFISSAO: { ponto: 'bg-sky-500', icone: 'text-sky-600 dark:text-sky-400' },
};

export const ROTULO_TIPO: Record<TipoDataEspecial, string> = {
  ANIVERSARIO_RESPONSAVEL: 'Aniversário',
  ANIVERSARIO_EMPRESA: 'Empresa',
  DIA_PROFISSAO: 'Profissão',
};
