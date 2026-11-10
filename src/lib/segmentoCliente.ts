import type { Segmento } from '@/lib/painelMensal';

const SEGMENTOS: Segmento[] = ['SERVICOS', 'COMERCIO_INDUSTRIA'];

/** Segmento do cliente pela tag (SERVICOS ou COMERCIO_INDUSTRIA). */
export function segmentoDasTags(tags: { nome: string }[] | null | undefined): Segmento | undefined {
  return (tags ?? []).map((t) => t.nome).find((n): n is Segmento => SEGMENTOS.includes(n as Segmento));
}

/**
 * Sugestão de segmento pelo CNAE principal (divisão = 2 primeiros dígitos):
 * extração e indústria (05 a 33) e comércio (45 a 47) vão para Comércio e Indústria; o resto, Serviços.
 * É só sugestão no cadastro: quem cadastra pode trocar.
 */
export function segmentoPeloCnae(cnae: string | null | undefined): Segmento | undefined {
  const digitos = (cnae ?? '').replace(/\D/g, '');
  if (digitos.length < 2) return undefined;
  const divisao = Number(digitos.slice(0, 2));
  if (divisao < 1) return undefined;
  if ((divisao >= 5 && divisao <= 33) || (divisao >= 45 && divisao <= 47)) return 'COMERCIO_INDUSTRIA';
  return 'SERVICOS';
}
