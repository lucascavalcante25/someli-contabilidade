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
