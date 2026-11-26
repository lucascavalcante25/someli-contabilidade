/**
 * Simulador CBS/IBS/IS — camada própria entre a tela e as calculadoras oficiais da Receita Federal
 * (github.com/ReceitaFederal/calculadora-rtc-regime-regular e calculadora-rtc-simples-nacional, licença MIT).
 *
 * Aqui só se MONTA a operação no formato que cada calculadora espera e se LÊ a resposta para exibir.
 * Nenhum valor de tributo é calculado no front: base, alíquota efetiva, redução e valores vêm da calculadora.
 * A única soma feita aqui é o "total de tributos" (CBS + IBS + IS já devolvidos), para a tela e a planilha.
 * Regras de montagem e fontes estão em docs/CALCULADORA_RTC.md.
 */
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

export type RegimeRtc = 'REGIME_REGULAR' | 'SIMPLES_NACIONAL';

export const REGIME_LABEL: Record<RegimeRtc, string> = {
  REGIME_REGULAR: 'Regime regular (Lucro Presumido / Real)',
  SIMPLES_NACIONAL: 'Simples Nacional',
};

// ---------------------------------------------------------------- formulários

export interface ItemRegimeRegular {
  ncm: string;
  nbs: string;
  cst: string;
  cClassTrib: string;
  baseCalculo: string;
  quantidade?: string;
  unidade?: string;
  impostoSeletivo?: {
    cst: string;
    cClassTrib: string;
    baseCalculo: string;
    impostoInformado?: string;
    aliquotaAdValorem?: string;
  } | null;
}

export interface FormRegimeRegular {
  /** Data do fato gerador, AAAA-MM-DD. */
  data: string;
  /** Código IBGE do município (7 dígitos). */
  municipio: string;
  uf: string;
  /** '' = não informar; '55' NF-e, '65' NFC-e etc. */
  tpDoc: string;
  /** Alíquotas nominais (%). Obrigatórias a partir de 2027; a calculadora proíbe antes disso. */
  aliquotas: { cbs: string; ibsEstadual: string; ibsMunicipal: string };
  itens: ItemRegimeRegular[];
}

export const itemRegimeRegularVazio = (): ItemRegimeRegular => ({
  ncm: '', nbs: '', cst: '000', cClassTrib: '000001', baseCalculo: '', quantidade: '', unidade: '', impostoSeletivo: null,
});

export type DocumentoSimples = '55' | '65' | '91';

export interface ItemSimples {
  cAtivSN: string;
  cClassTrib: string;
  ncm: string;
  nbs: string;
  baseCalculo: string;
  valorImpostoSeletivo: string;
  tribISSQN?: string;
  tpRetISSQN?: string;
}

export interface FormSimples {
  data: string;
  documento: DocumentoSimples;
  fatorR: boolean;
  impedimentoSublimite: boolean;
  /** Alíquota efetiva da CBS no Simples (%), a do PGDAS-D do período. */
  aliquotaCbs: string;
  /** Alíquota efetiva do IBS no Simples (%). */
  aliquotaIbs: string;
  itens: ItemSimples[];
}

export const itemSimplesVazio = (): ItemSimples => ({
  cAtivSN: '01', cClassTrib: '000001', ncm: '', nbs: '', baseCalculo: '', valorImpostoSeletivo: '', tribISSQN: '1', tpRetISSQN: '1',
});

export const DOCUMENTOS_SIMPLES: { value: DocumentoSimples; label: string }[] = [
  { value: '55', label: 'NF-e (mercadoria)' },
  { value: '65', label: 'NFC-e (varejo)' },
  { value: '91', label: 'NFS-e (serviço)' },
];

/** Atividades do Simples (cAtivSN), como no catálogo ATIVIDADE_SIMPLES_NACIONAL da calculadora (V0071). */
export const ATIVIDADES_SIMPLES: { value: string; label: string }[] = [
  { value: '01', label: '01 · Revenda / venda de mercadoria industrializada (Anexo I)' },
  { value: '02', label: '02 · Demais bens materiais sem ICMS (Anexo I)' },
  { value: '03', label: '03 · Industrialização incentivada ZFM (Anexo II)' },
  { value: '04', label: '04 · Demais bens com industrialização ZFM, sem ICMS (Anexo II)' },
  { value: '05', label: '05 · Transporte intermunicipal/interestadual (Anexo III)' },
  { value: '06', label: '06 · Comunicação (Anexo III)' },
  { value: '07', label: '07 · Serviços com ISS, só Anexo III' },
  { value: '08', label: '08 · Serviços contábeis com ISS fixo (Anexo III)' },
  { value: '09', label: '09 · Serviços sujeitos ao Fator "r" (Anexo III ou V)' },
  { value: '10', label: '10 · Transporte municipal de passageiros (Anexo III)' },
  { value: '11', label: '11 · Locação de bens móveis e demais, sem ISS (Anexo III)' },
  { value: '12', label: '12 · Construção civil 7.02/7.05 (Anexo III)' },
  { value: '13', label: '13 · Construção civil 7.02/7.05 (Anexo IV)' },
  { value: '14', label: '14 · Serviços do Anexo IV' },
  { value: '90', label: '90 · Operações não tributáveis' },
];

type ChaveAnexo = 'anexoI' | 'anexoII' | 'anexoIII' | 'anexoIV' | 'anexoV';

/** Anexo usado pela atividade (mesma regra do catálogo da calculadora; 09 depende do Fator "r"). */
export function anexoDaAtividade(cAtivSN: string, fatorR: boolean): ChaveAnexo | null {
  const codigo = cAtivSN.padStart(2, '0');
  if (['01', '02'].includes(codigo)) return 'anexoI';
  if (['03', '04'].includes(codigo)) return 'anexoII';
  if (codigo === '09') return fatorR ? 'anexoIII' : 'anexoV';
  if (['05', '06', '07', '08', '10', '11', '12'].includes(codigo)) return 'anexoIII';
  if (['13', '14'].includes(codigo)) return 'anexoIV';
  return null;
}

// ---------------------------------------------------------------- montagem

/** "1.200,50" ou "1200.50" → 1200.5. Vazio → undefined. */
export function numero(texto: string | undefined | null): number | undefined {
  if (texto == null) return undefined;
  const limpo = String(texto).trim();
  if (!limpo) return undefined;
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const valor = Number(normal);
  return Number.isFinite(valor) ? valor : undefined;
}

/** Decimal como texto com ponto, como a calculadora do Simples pede (sem notação científica). */
function decimalTexto(texto: string | undefined, casas?: number): string | undefined {
  const valor = numero(texto);
  if (valor === undefined) return undefined;
  if (casas !== undefined) return valor.toFixed(casas);
  // Mantém todas as casas digitadas (a calculadora usa todas): só troca a vírgula decimal por ponto.
  const limpo = String(texto).trim();
  return limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
}

function anoDe(data: string): number {
  return Number(data.slice(0, 4));
}

export interface OperacaoRegimeRegular {
  id: string;
  versao: string;
  dhFatoGerador: string;
  municipio: number;
  uf: string;
  tpDoc?: number;
  itens: Record<string, unknown>[];
}

export function montarOperacaoRegimeRegular(form: FormRegimeRegular, id: string): OperacaoRegimeRegular {
  const exigeAliquota = anoDe(form.data) >= 2027;
  const itens = form.itens.map((item, indice) => {
    const quantidade = numero(item.quantidade);
    const unidade = item.unidade?.trim() || undefined;
    const saida: Record<string, unknown> = { numero: indice + 1 };
    if (item.ncm.trim()) saida.ncm = item.ncm.replace(/\D/g, '');
    if (item.nbs.trim()) saida.nbs = item.nbs.replace(/\D/g, '');
    saida.cst = item.cst.trim();
    saida.cClassTrib = item.cClassTrib.trim();
    const base = numero(item.baseCalculo);
    if (base !== undefined) saida.baseCalculo = base;
    if (quantidade !== undefined) saida.quantidade = quantidade;
    if (unidade) saida.unidade = unidade;

    const is = item.impostoSeletivo;
    if (is && is.cst.trim()) {
      const grupo: Record<string, unknown> = {
        cst: is.cst.trim(),
        cClassTrib: is.cClassTrib.trim(),
        baseCalculo: numero(is.baseCalculo),
      };
      if (quantidade !== undefined) grupo.quantidade = quantidade;
      if (unidade) grupo.unidade = unidade;
      const informado = numero(is.impostoInformado);
      if (informado !== undefined) grupo.impostoInformado = informado;
      saida.impostoSeletivo = grupo;
    }

    if (exigeAliquota) {
      const aliquotas: Record<string, unknown> = {
        cbs: numero(form.aliquotas.cbs),
        ibsEstadual: numero(form.aliquotas.ibsEstadual),
        ibsMunicipal: numero(form.aliquotas.ibsMunicipal),
      };
      const adValorem = numero(is?.aliquotaAdValorem);
      if (is && is.cst.trim() && adValorem !== undefined) aliquotas.impostoSeletivo = { adValorem };
      saida.aliquotasNominais = aliquotas;
    }
    return saida;
  });

  const operacao: OperacaoRegimeRegular = {
    id,
    versao: '1.0.0',
    dhFatoGerador: `${form.data}T12:00:00-03:00`,
    municipio: Number(form.municipio.replace(/\D/g, '')),
    uf: form.uf.trim().toUpperCase(),
    itens,
  };
  if (form.tpDoc) operacao.tpDoc = Number(form.tpDoc);
  return operacao;
}

export interface OperacaoSimples {
  id: string;
  versao: string;
  data: string;
  tpDoc: string;
  CRT?: string;
  opSimpNac?: string;
  regApIBSCBSSN?: string;
  regApTribSN?: string;
  aliquotasEfetivas: Record<string, unknown>;
  itens: Record<string, unknown>[];
}

/**
 * Endpoint "não assistido" do Simples: a linha de alíquotas efetivas do período vai por anexo.
 * NF-e/NFC-e levam CRT=1 (optante); NFS-e leva opSimpNac=3 (ME/EPP) e os dois regimes de apuração "pelo Simples".
 */
export function montarOperacaoSimples(form: FormSimples, id: string): OperacaoSimples {
  const nfse = form.documento === '91';
  const aliquotasEfetivas: Record<string, unknown> = {
    fatorR: form.fatorR,
    impedimentoSublimite: form.impedimentoSublimite,
  };
  const par = {
    pCBSSN: decimalTexto(form.aliquotaCbs),
    pIBSSN: form.impedimentoSublimite ? undefined : decimalTexto(form.aliquotaIbs),
  };
  for (const item of form.itens) {
    const anexo = anexoDaAtividade(item.cAtivSN, form.fatorR);
    if (anexo && !(anexo in aliquotasEfetivas)) aliquotasEfetivas[anexo] = { ...par };
  }

  const itens = form.itens.map((item, indice) => {
    const saida: Record<string, unknown> = {
      numero: indice + 1,
      cAtivSN: item.cAtivSN.trim().padStart(2, '0'),
      cClassTrib: item.cClassTrib.trim(),
    };
    if (item.ncm.trim()) saida.ncm = item.ncm.replace(/\D/g, '');
    if (item.nbs.trim()) saida.nbs = item.nbs.replace(/\D/g, '');
    saida.baseCalculo = decimalTexto(item.baseCalculo, 2);
    if (nfse) {
      if (item.tribISSQN) saida.tribISSQN = item.tribISSQN;
      if (item.tpRetISSQN) saida.tpRetISSQN = item.tpRetISSQN;
    } else {
      saida.valorImpostoSeletivo = decimalTexto(item.valorImpostoSeletivo, 2) ?? '0.00';
    }
    return saida;
  });

  const operacao: OperacaoSimples = {
    id,
    versao: '3.0.0',
    data: form.data,
    tpDoc: form.documento,
    aliquotasEfetivas,
    itens,
  };
  if (nfse) {
    operacao.opSimpNac = '3';
    operacao.regApIBSCBSSN = '1';
    operacao.regApTribSN = '1';
  } else {
    operacao.CRT = '1';
  }
  return JSON.parse(JSON.stringify(operacao)) as OperacaoSimples;
}

// ---------------------------------------------------------------- leitura da resposta

export interface ItemResumo {
  numero: number;
  estado: string;
  calculado: boolean;
  base: number | null;
  cbs: number | null;
  ibsUf: number | null;
  ibsMun: number | null;
  ibs: number | null;
  is: number | null;
  /** Alíquota efetiva aplicada (%), já com redução, como a calculadora devolveu. */
  aliquotaCbs: number | null;
  aliquotaIbs: number | null;
  reducao: number | null;
  memoria: string;
  erros: string[];
}

export interface TotalResumo {
  base: number | null;
  cbs: number | null;
  ibs: number | null;
  is: number | null;
  totalTributos: number | null;
}

export interface ResumoResultado {
  itens: ItemResumo[];
  total: TotalResumo | null;
}

type Json = Record<string, unknown>;

function obj(valor: unknown): Json | null {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Json) : null;
}

function caminho(raiz: unknown, ...chaves: string[]): unknown {
  let atual: unknown = raiz;
  for (const chave of chaves) {
    const o = obj(atual);
    if (!o) return undefined;
    atual = o[chave];
  }
  return atual;
}

function num(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

function soma(...valores: (number | null)[]): number | null {
  if (valores.every((v) => v === null)) return null;
  return Math.round(valores.reduce<number>((acc, v) => acc + (v ?? 0), 0) * 100) / 100;
}

const ROTULO_MEMORIA: Record<string, string> = {
  cbs: 'CBS',
  ibsUF: 'IBS estadual',
  ibsMun: 'IBS municipal',
  ibs: 'IBS',
};

/** Memória de cálculo em texto, cada linha com o tributo a que se refere (o texto é o da calculadora). */
function textoMemoria(memoria: unknown, rotulo?: string): string {
  if (typeof memoria === 'string') return memoria.trim() ? (rotulo ? `${rotulo}: ${memoria}` : memoria) : '';
  const o = obj(memoria);
  if (!o) return '';
  return Object.entries(o)
    .filter((par): par is [string, string] => typeof par[1] === 'string' && par[1].trim() !== '')
    .map(([chave, texto]) => `${ROTULO_MEMORIA[chave] ?? chave}: ${texto}`)
    .join('\n');
}

function errosDoItem(item: Json): string[] {
  const erros = Array.isArray(item.erros) ? item.erros : [];
  const textos = erros.map((e) => {
    const o = obj(e) ?? {};
    const codigo = typeof o.code === 'string' ? o.code : typeof o.codigo === 'string' ? o.codigo : '';
    const detalhe = typeof o.detail === 'string' ? o.detail : typeof o.title === 'string' ? o.title : '';
    return [codigo, detalhe].filter(Boolean).join(' · ');
  });
  const motivo = obj(item.motivoEstado);
  if (motivo) {
    textos.push([motivo.codigo, motivo.descricao].filter((v) => typeof v === 'string' && v).join(' · '));
  }
  return textos.filter(Boolean);
}

const ESTADOS_CALCULADOS = ['CALCULADO', 'CALCULO_SIMULADO'];

function itemRegimeRegular(item: Json): ItemResumo {
  const ibscbs = caminho(item, 'tribCalc', 'IBSCBS');
  const g = caminho(ibscbs, 'gIBSCBS');
  const is = caminho(item, 'tribCalc', 'IS');
  const estado = String(item.estadoItem ?? '');
  const memoria = [textoMemoria(caminho(ibscbs, 'memoriaCalculo')), textoMemoria(caminho(is, 'memoriaCalculo'), 'IS')]
    .filter(Boolean).join('\n');
  return {
    numero: Number(item.nObj ?? 0),
    estado,
    calculado: ESTADOS_CALCULADOS.includes(estado),
    base: num(caminho(g, 'vBC')),
    cbs: num(caminho(g, 'gCBS', 'vCBS')),
    ibsUf: num(caminho(g, 'gIBSUF', 'vIBSUF')),
    ibsMun: num(caminho(g, 'gIBSMun', 'vIBSMun')),
    ibs: num(caminho(g, 'vIBS')),
    is: num(caminho(is, 'vIS')),
    aliquotaCbs: num(caminho(g, 'gCBS', 'gRed', 'pAliqEfet')) ?? num(caminho(g, 'gCBS', 'pCBS')),
    aliquotaIbs: null,
    reducao: num(caminho(g, 'gCBS', 'gRed', 'pRedAliq')),
    memoria,
    erros: errosDoItem(item),
  };
}

function itemSimples(item: Json): ItemResumo {
  const t = obj(item.tribCalc);
  const estado = String(item.estadoItem ?? '');
  return {
    numero: Number(item.nObj ?? 0),
    estado,
    calculado: ESTADOS_CALCULADOS.includes(estado),
    base: num(t?.vBC),
    cbs: num(t?.vCBSSN),
    ibsUf: null,
    ibsMun: null,
    ibs: num(t?.vIBSSN),
    is: num(caminho(t, 'IS', 'valor')),
    aliquotaCbs: num(t?.pCBSSN),
    aliquotaIbs: num(t?.pIBSSN),
    reducao: null,
    memoria: textoMemoria(t?.memoriaCalculo),
    erros: errosDoItem(item),
  };
}

export function resumirResultado(regime: RegimeRtc, resposta: unknown): ResumoResultado {
  const objetos = caminho(resposta, 'objetos');
  const lista = Array.isArray(objetos) ? objetos.map((o) => obj(o) ?? {}) : [];
  if (regime === 'SIMPLES_NACIONAL') {
    const t = obj(caminho(resposta, 'total'));
    return {
      itens: lista.map(itemSimples),
      total: t ? {
        base: num(t.vBC),
        cbs: num(t.vCBSSNtot),
        ibs: num(t.vIBSSNtot),
        is: num(t.totalIs),
        totalTributos: num(t.totalTributos) ?? soma(num(t.vCBSSNtot), num(t.vIBSSNtot), num(t.totalIs)),
      } : null,
    };
  }
  const tot = caminho(resposta, 'total', 'tribCalc');
  const cbs = num(caminho(tot, 'IBSCBSTot', 'gCBS', 'vCBS'));
  const ibs = num(caminho(tot, 'IBSCBSTot', 'gIBS', 'vIBS'));
  const is = num(caminho(tot, 'ISTot', 'vIS'));
  return {
    itens: lista.map(itemRegimeRegular),
    total: tot ? {
      base: num(caminho(tot, 'IBSCBSTot', 'vBCIBSCBS')),
      cbs,
      ibs,
      is,
      totalTributos: soma(cbs, ibs, is),
    } : null,
  };
}

export function avisoSimulacao(versao: string | null | undefined): string {
  const v = versao?.trim() ? `versão ${versao.trim()}` : 'versão não informada';
  return `Simulação com a calculadora oficial da Receita Federal (${v}). Conferir enquadramento e classificação antes de orientar o cliente.`;
}

export const AVISO_LICENCA =
  'Cálculo feito pelas calculadoras de tributos da Receita Federal (github.com/ReceitaFederal), '
  + 'distribuídas sob a licença MIT, sem alteração na lógica de cálculo.';

// ---------------------------------------------------------------- planilha (CSV para Excel pt-BR)

function moeda(valor: number | null): string {
  return valor === null ? '' : valor.toFixed(2).replace('.', ',');
}

function campo(valor: string): string {
  return /[;"\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

export function resumoParaCsv(dados: { titulo: string; regime: RegimeRtc; versao: string | null; resumo: ResumoResultado }): string {
  const linhas: string[] = [];
  // BOM para o Excel abrir em UTF-8.
  linhas.push(`${String.fromCharCode(0xfeff)}"${dados.titulo.replace(/"/g, '""')}"`);
  linhas.push(campo(REGIME_LABEL[dados.regime]));
  linhas.push(campo(avisoSimulacao(dados.versao)));
  linhas.push(campo(AVISO_LICENCA));
  linhas.push('');
  linhas.push('Item;Situação;Base de cálculo;CBS;IBS UF;IBS Mun;IBS;IS;Total de tributos;Observação');
  for (const item of dados.resumo.itens) {
    linhas.push([
      String(item.numero),
      item.estado,
      moeda(item.base),
      moeda(item.cbs),
      moeda(item.ibsUf),
      moeda(item.ibsMun),
      moeda(item.ibs),
      moeda(item.is),
      item.calculado ? moeda(soma(item.cbs, item.ibs, item.is)) : '',
      campo(item.erros.join(' | ')),
    ].join(';'));
  }
  const t = dados.resumo.total;
  if (t) {
    linhas.push(['Total', '', moeda(t.base), moeda(t.cbs), '', '', moeda(t.ibs), moeda(t.is), moeda(t.totalTributos), ''].join(';'));
  }
  return linhas.join('\r\n');
}

// ---------------------------------------------------------------- relatório para imprimir / salvar em PDF

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function relatorioHtml(dados: {
  titulo: string;
  regime: RegimeRtc;
  versao: string | null;
  versaoBase: string | null;
  resumo: ResumoResultado;
}): string {
  const linhas = dados.resumo.itens.map((i) => `
      <tr>
        <td>${i.numero}</td>
        <td>${escapar(i.estado)}</td>
        <td class="n">${moeda(i.base)}</td>
        <td class="n">${moeda(i.cbs)}</td>
        <td class="n">${moeda(i.ibs)}</td>
        <td class="n">${moeda(i.is)}</td>
        <td class="n">${i.calculado ? moeda(soma(i.cbs, i.ibs, i.is)) : ''}</td>
      </tr>
      ${i.erros.length ? `<tr><td></td><td colspan="6" class="erro">${escapar(i.erros.join(' | '))}</td></tr>` : ''}
      ${i.memoria ? `<tr><td></td><td colspan="6" class="mem">${escapar(i.memoria).replace(/\n/g, '<br>')}</td></tr>` : ''}`).join('');
  const t = dados.resumo.total;
  const total = t ? `
      <tr class="total">
        <td colspan="2">Total</td>
        <td class="n">${moeda(t.base)}</td>
        <td class="n">${moeda(t.cbs)}</td>
        <td class="n">${moeda(t.ibs)}</td>
        <td class="n">${moeda(t.is)}</td>
        <td class="n">${moeda(t.totalTributos)}</td>
      </tr>` : '';
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escapar(dados.titulo)}</title>
<style>
  body{font-family:Inter,Arial,sans-serif;color:#1f1724;margin:24px;font-size:12px}
  h1{color:#58196A;font-size:18px;margin:0 0 4px}
  .aviso{border-left:4px solid #EA5DB9;background:#FAF6FA;padding:8px 10px;margin:12px 0}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{border-bottom:1px solid #e5dbe8;padding:5px 6px;text-align:left;vertical-align:top}
  th{background:#FAF6FA;color:#58196A}
  .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .erro{color:#b42318}
  .mem{color:#5b5060;font-size:11px}
  .total td{font-weight:700}
  .rodape{margin-top:16px;color:#5b5060;font-size:10px}
</style></head><body>
  <h1>${escapar(dados.titulo)}</h1>
  <div>${escapar(REGIME_LABEL[dados.regime])}${dados.versaoBase ? ` · base de dados ${escapar(dados.versaoBase)}` : ''}</div>
  <div class="aviso">${escapar(avisoSimulacao(dados.versao))}</div>
  <table>
    <thead><tr><th>Item</th><th>Situação</th><th class="n">Base</th><th class="n">CBS</th><th class="n">IBS</th><th class="n">IS</th><th class="n">Tributos</th></tr></thead>
    <tbody>${linhas}${total}</tbody>
  </table>
  <p class="rodape">${escapar(AVISO_LICENCA)} Valores em R$. Documento interno da Someli Contabilidade, não é documento fiscal.</p>
</body></html>`;
}

// ---------------------------------------------------------------- API do sistema

export interface VersaoCalculadora {
  regime: RegimeRtc;
  disponivel: boolean;
  detalhes: Record<string, unknown> | null;
  mensagem: string | null;
}

export interface ResultadoSimulacao {
  regime: RegimeRtc;
  versaoCalculadora: string | null;
  versaoBase: string | null;
  avisoDadosSimulados: string | null;
  resultado: unknown;
}

export interface CenarioRtc {
  id: number;
  clienteId: number;
  nome: string;
  regime: RegimeRtc;
  observacao: string | null;
  operacao: unknown;
  resultado: unknown;
  versaoCalculadora: string | null;
  versaoBase: string | null;
  avisoDadosSimulados: string | null;
  criadoPor: string | null;
  criadoEm: string | null;
}

export class ErroSimulador extends Error {
  readonly tipo: 'rede' | 'credencial' | 'permissao' | 'calculadora' | 'validacao' | 'servidor';

  constructor(message: string, tipo: ErroSimulador['tipo']) {
    super(message);
    this.name = 'ErroSimulador';
    this.tipo = tipo;
  }
}

function mensagemDoCorpo(corpo: unknown): string | null {
  const o = obj(corpo);
  return o && typeof o.message === 'string' ? o.message : null;
}

async function requisicao<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(url, { cache: 'no-store', ...init }, { manterNo403: true });
  } catch {
    throw new ErroSimulador('Sem conexão com o servidor. Verifique a internet e tente de novo.', 'rede');
  }
  if (response.status === 401) throw new ErroSimulador('Sua sessão expirou. Entre novamente.', 'credencial');
  if (response.status === 204) return undefined as T;
  const corpo: unknown = await response.json().catch(() => null);
  const mensagem = mensagemDoCorpo(corpo);
  if (response.status === 403) {
    throw new ErroSimulador(mensagem ?? 'Você não tem permissão para usar o simulador.', 'permissao');
  }
  if (response.status === 503 || response.status === 502) {
    throw new ErroSimulador(mensagem ?? 'Calculadora da Receita indisponível no momento.', 'calculadora');
  }
  if (response.status === 400 || response.status === 422) {
    throw new ErroSimulador(mensagem ?? 'Confira os dados da operação.', 'validacao');
  }
  if (!response.ok) throw new ErroSimulador(mensagem ?? `Erro ${response.status} ao falar com o servidor`, 'servidor');
  return corpo as T;
}

const json = (corpo: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
});

export const CHAVE_VERSOES_RTC = ['simulador-rtc', 'versoes'] as const;
export const CHAVE_CENARIOS_RTC = (clienteId: number) => ['simulador-rtc', 'cenarios', clienteId] as const;

export function buscarVersoes() {
  return requisicao<VersaoCalculadora[]>(`${API_BASE_URL}/simulador-rtc/versoes`);
}

export function calcularSimulacao(regime: RegimeRtc, operacao: unknown) {
  return requisicao<ResultadoSimulacao>(`${API_BASE_URL}/simulador-rtc/calcular`, json({ regime, operacao }));
}

export function listarCenarios(clienteId: number) {
  return requisicao<CenarioRtc[]>(`${API_BASE_URL}/clientes/${clienteId}/simulacoes-rtc`);
}

export function salvarCenario(clienteId: number, dados: { nome: string; regime: RegimeRtc; operacao: unknown; observacao?: string }) {
  return requisicao<CenarioRtc>(`${API_BASE_URL}/clientes/${clienteId}/simulacoes-rtc`, json(dados));
}

export interface ClienteSimulacao {
  id: number;
  nome: string;
  regimeTributario: string | null;
}

/** Clientes na alçada do usuário (o backend já filtra). Só para escolher onde salvar o cenário. */
export async function listarClientesParaSimulacao(): Promise<ClienteSimulacao[]> {
  const lista = await requisicao<{ id: number; razaoSocial?: string | null; nomeFantasia?: string | null; regimeTributario?: string | null; ativo?: boolean | null }[]>(
    `${API_BASE_URL}/clientes`,
  );
  return (lista ?? [])
    .filter((c) => c.ativo !== false)
    .map((c) => ({ id: c.id, nome: c.nomeFantasia?.trim() || c.razaoSocial?.trim() || `Cliente ${c.id}`, regimeTributario: c.regimeTributario ?? null }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function excluirCenario(id: number) {
  return requisicao<null>(`${API_BASE_URL}/simulacoes-rtc/${id}`, { method: 'DELETE' });
}

/** Versão do JSON de /versao de cada calculadora (os nomes de campo diferem entre as duas). */
export function versaoDosDetalhes(detalhes: Record<string, unknown> | null | undefined): string | null {
  if (!detalhes) return null;
  for (const chave of ['versaoApp', 'versaoAplicacao', 'versao', 'version']) {
    const v = detalhes[chave];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export function novoIdSimulacao(): string {
  return `someli-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
