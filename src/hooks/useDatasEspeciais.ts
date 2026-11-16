import { useQuery } from '@tanstack/react-query';
import { carregarDatasEspeciais } from '@/lib/datasEspeciais';
import { ErroPainel } from '@/lib/painelMensal';

/** Datas especiais de um mês (aniversários e dias de profissão dos clientes na alçada). */
export function useDatasEspeciais(ano: number, mes: number) {
  return useQuery({
    queryKey: ['datas-especiais', ano, mes],
    queryFn: () => carregarDatasEspeciais(ano, mes),
    staleTime: 5 * 60 * 1000,
    // Só tenta de novo quando faltou conexão; erro do servidor (ex.: sem permissão) aparece na hora
    retry: (tentativas, erro) => erro instanceof ErroPainel && erro.tipo === 'rede' && tentativas < 2,
  });
}
