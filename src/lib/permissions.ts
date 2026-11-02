/** Códigos alinhados ao backend (PermissaoCodigo). */
export const Permissoes = {
  DASHBOARD_VISUALIZAR: 'DASHBOARD_VISUALIZAR',
  CONSULTAS_VISUALIZAR: 'CONSULTAS_VISUALIZAR',
  CLIENTES_VISUALIZAR: 'CLIENTES_VISUALIZAR',
  CLIENTES_CADASTRAR: 'CLIENTES_CADASTRAR',
  CLIENTES_EDITAR: 'CLIENTES_EDITAR',
  CLIENTES_EXCLUIR: 'CLIENTES_EXCLUIR',
  CLIENTES_RESPONSAVEIS_EDITAR: 'CLIENTES_RESPONSAVEIS_EDITAR',
  OBRIGACOES_VISUALIZAR: 'OBRIGACOES_VISUALIZAR',
  OBRIGACOES_CRIAR: 'OBRIGACOES_CRIAR',
  OBRIGACOES_EDITAR: 'OBRIGACOES_EDITAR',
  OBRIGACOES_CONCLUIR: 'OBRIGACOES_CONCLUIR',
  OBRIGACOES_EXCLUIR: 'OBRIGACOES_EXCLUIR',
  OBRIGACOES_TIPOS_GERENCIAR: 'OBRIGACOES_TIPOS_GERENCIAR',
  FINANCEIRO_VISUALIZAR: 'FINANCEIRO_VISUALIZAR',
  FINANCEIRO_LANCAR: 'FINANCEIRO_LANCAR',
  HONORARIO_VISUALIZAR: 'HONORARIO_VISUALIZAR',
  HONORARIO_EDITAR: 'HONORARIO_EDITAR',
  DESPESAS_VISUALIZAR: 'DESPESAS_VISUALIZAR',
  DESPESAS_EDITAR: 'DESPESAS_EDITAR',
  USUARIOS_VISUALIZAR: 'USUARIOS_VISUALIZAR',
  USUARIOS_CADASTRAR: 'USUARIOS_CADASTRAR',
  USUARIOS_EDITAR: 'USUARIOS_EDITAR',
  USUARIOS_PERMISSOES: 'USUARIOS_PERMISSOES',
  VISAO_GERENCIAL: 'VISAO_GERENCIAL',
  ALCADA_GLOBAL: 'ALCADA_GLOBAL',
} as const;

export type PermissaoCode = (typeof Permissoes)[keyof typeof Permissoes];

/** Textos exibidos na tela de permissões. O código continua sendo a chave técnica. */
const PERMISSAO_TEXTOS: Record<string, { titulo: string; ajuda: string }> = {
  DASHBOARD_VISUALIZAR: { titulo: 'Visualizar dashboard', ajuda: 'Acessa o painel inicial do escritório.' },
  VISAO_GERENCIAL: { titulo: 'Visualizar indicadores gerenciais', ajuda: 'Mostra os indicadores gerenciais no Meu Trabalho.' },
  CONSULTAS_VISUALIZAR: { titulo: 'Acessar consultas', ajuda: 'Acessa as consultas de CNPJ, inscrição estadual, CEP e feriados.' },
  ADMINISTRACAO_VISUALIZAR: { titulo: 'Acessar administração', ajuda: 'Libera telas e ações administrativas do sistema.' },
  ALCADA_GLOBAL: { titulo: 'Acessar todos os clientes', ajuda: 'Vê e opera todos os clientes, sem restrição de carteira.' },
  ALCADA_SETOR: { titulo: 'Ampliar acesso ao setor', ajuda: 'Amplia o acesso dentro do setor em que é responsável.' },
  CLIENTES_VISUALIZAR: { titulo: 'Visualizar clientes', ajuda: 'Lista e abre as fichas dos clientes da carteira.' },
  CLIENTES_CADASTRAR: { titulo: 'Cadastrar clientes', ajuda: 'Cria novos clientes no escritório.' },
  CLIENTES_EDITAR: { titulo: 'Editar clientes', ajuda: 'Altera dados cadastrais e tags do cliente.' },
  CLIENTES_EXCLUIR: { titulo: 'Excluir clientes', ajuda: 'Remove clientes. Esta ação é irreversível.' },
  CLIENTES_RESPONSAVEIS_EDITAR: { titulo: 'Definir responsáveis', ajuda: 'Define os responsáveis por setor (fiscal, DP etc.).' },
  OBRIGACOES_VISUALIZAR: { titulo: 'Visualizar obrigações', ajuda: 'Consulta obrigações e ocorrências.' },
  OBRIGACOES_CRIAR: { titulo: 'Criar obrigações', ajuda: 'Cria vínculos e aplica obrigações em massa.' },
  OBRIGACOES_EDITAR: { titulo: 'Editar obrigações', ajuda: 'Altera vencimentos e status operacionais.' },
  OBRIGACOES_CONCLUIR: { titulo: 'Concluir obrigações', ajuda: 'Marca ocorrências como concluídas ou entregues.' },
  OBRIGACOES_EXCLUIR: { titulo: 'Excluir obrigações', ajuda: 'Remove vínculos de obrigações.' },
  OBRIGACOES_REABRIR: { titulo: 'Reabrir obrigações', ajuda: 'Reabre ocorrências já finalizadas.' },
  OBRIGACOES_TIPOS_GERENCIAR: { titulo: 'Gerenciar tipos de obrigação', ajuda: 'Cria, altera e remove itens do catálogo de obrigações.' },
  FINANCEIRO_VISUALIZAR: { titulo: 'Visualizar financeiro', ajuda: 'Acessa o resumo e os lançamentos financeiros.' },
  FINANCEIRO_LANCAR: { titulo: 'Lançar pagamentos', ajuda: 'Registra pagamentos de honorários.' },
  FINANCEIRO_EDITAR: { titulo: 'Editar lançamentos', ajuda: 'Altera lançamentos financeiros existentes.' },
  FINANCEIRO_EXCLUIR: { titulo: 'Excluir lançamentos', ajuda: 'Remove lançamentos financeiros.' },
  HONORARIO_VISUALIZAR: { titulo: 'Visualizar honorários', ajuda: 'Exibe os valores de honorários, que são informação sensível.' },
  HONORARIO_EDITAR: { titulo: 'Editar honorários', ajuda: 'Altera os honorários dos clientes.' },
  DESPESAS_VISUALIZAR: { titulo: 'Visualizar despesas', ajuda: 'Consulta as despesas do escritório.' },
  DESPESAS_EDITAR: { titulo: 'Editar despesas', ajuda: 'Lança e edita despesas.' },
  USUARIOS_VISUALIZAR: { titulo: 'Visualizar usuários', ajuda: 'Lista os usuários internos do escritório.' },
  USUARIOS_CADASTRAR: { titulo: 'Cadastrar usuários', ajuda: 'Cria novos usuários internos.' },
  USUARIOS_EDITAR: { titulo: 'Editar usuários', ajuda: 'Altera dados, perfil e foto de outros usuários.' },
  USUARIOS_DESATIVAR: { titulo: 'Excluir usuários', ajuda: 'Remove usuários do sistema.' },
  USUARIOS_PERMISSOES: { titulo: 'Alterar permissões', ajuda: 'Define as permissões de outros usuários.' },
  RELATORIOS_OPERACIONAIS: { titulo: 'Visualizar relatórios operacionais', ajuda: 'Acessa os relatórios da operação.' },
  RELATORIOS_FINANCEIROS: { titulo: 'Visualizar relatórios financeiros', ajuda: 'Acessa os relatórios com valores financeiros.' },
  RELATORIOS_EXPORTAR: { titulo: 'Exportar relatórios', ajuda: 'Gera arquivos a partir dos relatórios.' },
};

const MODULO_LABELS: Record<string, string> = {
  ADMINISTRACAO: 'Administração',
  ALCADA: 'Alçada',
  CLIENTES: 'Clientes',
  CONSULTAS: 'Consultas',
  DASHBOARD: 'Dashboard',
  DESPESAS: 'Despesas',
  FINANCEIRO: 'Financeiro',
  HONORARIOS: 'Honorários',
  OBRIGACOES: 'Obrigações',
  RELATORIOS: 'Relatórios',
  USUARIOS: 'Usuários',
};

const PERFIL_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SOCIO: 'Sócio',
  CONTABIL: 'Contábil',
  ESTAGIARIO: 'Estagiário',
};

function humanizar(codigo: string): string {
  const texto = codigo.replace(/_/g, ' ').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function moduloLabel(modulo: string): string {
  return MODULO_LABELS[modulo] ?? humanizar(modulo);
}

export function formatarPerfil(perfil: string): string {
  return PERFIL_LABELS[perfil] ?? humanizar(perfil);
}

export function permissaoTitulo(codigo: string, descricao?: string): string {
  const texto = PERMISSAO_TEXTOS[codigo]?.titulo ?? descricao;
  if (texto) return texto;
  const [modulo, ...resto] = codigo.split('_');
  return [moduloLabel(modulo), ...resto.map((p) => p.toLowerCase())].join(' ');
}

export function permissaoAjuda(codigo: string, descricao?: string): string | undefined {
  return PERMISSAO_TEXTOS[codigo]?.ajuda ?? descricao;
}

export function hasPermission(permissoes: string[] | undefined | null, code: string): boolean {
  return !!permissoes?.includes(code);
}

export function canAccessModule(permissoes: string[] | undefined | null, modulo: string): boolean {
  if (!permissoes) return false;
  switch (modulo.toUpperCase()) {
    case 'DASHBOARD':
      return hasPermission(permissoes, Permissoes.DASHBOARD_VISUALIZAR);
    case 'CONSULTAS':
      return hasPermission(permissoes, Permissoes.CONSULTAS_VISUALIZAR);
    case 'CLIENTES':
      return hasPermission(permissoes, Permissoes.CLIENTES_VISUALIZAR);
    case 'FINANCEIRO':
      return hasPermission(permissoes, Permissoes.FINANCEIRO_VISUALIZAR);
    case 'DESPESAS':
      return hasPermission(permissoes, Permissoes.DESPESAS_VISUALIZAR);
    case 'OBRIGACOES_TIPOS':
      return hasPermission(permissoes, Permissoes.OBRIGACOES_TIPOS_GERENCIAR)
        || hasPermission(permissoes, Permissoes.OBRIGACOES_VISUALIZAR);
    case 'USUARIOS':
      return hasPermission(permissoes, Permissoes.USUARIOS_VISUALIZAR);
    default:
      return false;
  }
}

export const SETORES_RESPONSAVEL = [
  { value: 'FISCAL', label: 'Fiscal' },
  { value: 'DEPARTAMENTO_PESSOAL', label: 'Departamento Pessoal' },
  { value: 'CONTABIL', label: 'Contábil' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'GERENTE_CONTA', label: 'Gerente / Responsável Principal' },
  { value: 'SOCIETARIO', label: 'Societário' },
  { value: 'OUTROS', label: 'Outros' },
] as const;

export const PERFIS = [
  'ADMIN', 'SOCIO', 'GERENTE', 'SUPERVISOR_FISCAL', 'FISCAL',
  'SUPERVISOR_DP', 'DEPARTAMENTO_PESSOAL', 'CONTABIL', 'FINANCEIRO',
  'ATENDIMENTO', 'ESTAGIARIO', 'CONTADOR', 'OPERADOR',
] as const;
