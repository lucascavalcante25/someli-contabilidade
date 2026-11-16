import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';
import AppSelect from '@/components/shared/AppSelect';
import ProfissoesDialog from '@/components/clientes/ProfissoesDialog';
import { useAuth } from '@/contexts/AuthContext';
import { CHAVE_PROFISSOES, listarProfissoes, sugerirProfissao } from '@/lib/datasEspeciais';
import { Permissoes } from '@/lib/permissions';

export interface ValoresDatasEspeciais {
  /** yyyy-MM-dd ou vazio */
  dataNascimentoResponsavel: string;
  dataAbertura: string;
  profissaoId: number | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

function mascarar(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "20/10/1985" → "1985-10-20"; null se não for uma data real entre 1900 e hoje. */
function paraIso(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return null;
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
  if (ano < 1900 || data > new Date()) return null;
  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

const paraBrasil = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

/** Data digitada (dd/mm/aaaa): mais rápido que voltar décadas no calendário para achar um nascimento. */
function DataDigitada({ id, rotulo, valor, onChange }: { id: string; rotulo: string; valor: string; onChange: (iso: string) => void }) {
  const [texto, setTexto] = useState(paraBrasil(valor));
  const ultimoIso = useRef(valor);

  // Valor trocado de fora (cliente carregado, consulta do CNPJ): reflete no campo
  useEffect(() => {
    if (valor !== ultimoIso.current) {
      ultimoIso.current = valor;
      setTexto(paraBrasil(valor));
    }
  }, [valor]);

  const completo = texto.length === 10;
  const invalido = completo && paraIso(texto) === null;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label-text">{rotulo}</label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        value={texto}
        aria-invalid={invalido}
        onChange={(e) => {
          const novo = mascarar(e.target.value);
          setTexto(novo);
          const iso = paraIso(novo) ?? '';
          ultimoIso.current = iso;
          onChange(iso);
        }}
        className="flex h-[42px] w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums outline-none transition-all hover:border-muted-foreground/35 focus-visible:ring-2 focus-visible:ring-ring/20 aria-[invalid=true]:border-destructive"
      />
      {invalido && <p className="text-[11px] text-destructive">Data inválida</p>}
    </div>
  );
}

/**
 * Aniversário do dono, abertura da empresa e profissão: alimentam o calendário de datas especiais
 * do Dashboard e o aviso do dia. A profissão pode vir sugerida pelo CNAE da consulta do CNPJ.
 */
export default function DatasEspeciaisCampos({ valores, onChange, cnaePrincipal }: {
  valores: ValoresDatasEspeciais;
  onChange: (valores: ValoresDatasEspeciais) => void;
  cnaePrincipal?: string;
}) {
  const { can } = useAuth();
  const [gerenciar, setGerenciar] = useState(false);
  const profissoesQuery = useQuery({ queryKey: CHAVE_PROFISSOES, queryFn: listarProfissoes, staleTime: 5 * 60 * 1000 });
  const profissoes = useMemo(() => profissoesQuery.data ?? [], [profissoesQuery.data]);
  const sugeriu = useRef(false);

  useEffect(() => {
    if (sugeriu.current || valores.profissaoId != null || !cnaePrincipal || !profissoes.length) return;
    sugeriu.current = true;
    const sugestao = sugerirProfissao(profissoes, cnaePrincipal);
    if (sugestao) onChange({ ...valores, profissaoId: sugestao.id });
  }, [cnaePrincipal, profissoes, valores, onChange]);

  const atual = profissoes.find((p) => p.id === valores.profissaoId);
  const opcoes = [
    { value: '', label: 'Não informada' },
    ...profissoes
      .filter((p) => p.ativo || p.id === valores.profissaoId)
      .map((p) => ({ value: String(p.id), label: `${p.nome} (${pad(p.dia)}/${pad(p.mes)})` })),
  ];

  return (
    <>
      <DataDigitada
        id="data-nascimento-responsavel"
        rotulo="Aniversário do responsável"
        valor={valores.dataNascimentoResponsavel}
        onChange={(iso) => onChange({ ...valores, dataNascimentoResponsavel: iso })}
      />
      <DataDigitada
        id="data-abertura-empresa"
        rotulo="Abertura da empresa"
        valor={valores.dataAbertura}
        onChange={(iso) => onChange({ ...valores, dataAbertura: iso })}
      />
      <div className="space-y-1.5 sm:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <span id="profissao-cliente-rotulo" className="label-text">Profissão</span>
          {can(Permissoes.CLIENTES_EDITAR) && (
            <button type="button" onClick={() => setGerenciar(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
              <Settings2 className="h-3 w-3" aria-hidden /> Profissões e datas
            </button>
          )}
        </div>
        <div aria-labelledby="profissao-cliente-rotulo">
          <AppSelect
            value={valores.profissaoId != null ? String(valores.profissaoId) : ''}
            onChange={(v) => onChange({ ...valores, profissaoId: v ? Number(v) : null })}
            allowEmpty
            placeholder={profissoesQuery.isLoading ? 'Carregando…' : 'Não informada'}
            options={opcoes}
            disabled={profissoesQuery.isLoading}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {profissoesQuery.isError
            ? 'Não foi possível carregar as profissões.'
            : atual
              ? `Dia do ${atual.nome}: ${pad(atual.dia)}/${pad(atual.mes)}`
              : 'Para lembrar o dia da profissão (ex.: Dia do Dentista).'}
        </p>
      </div>
      {gerenciar && <ProfissoesDialog onFechar={() => setGerenciar(false)} />}
    </>
  );
}
