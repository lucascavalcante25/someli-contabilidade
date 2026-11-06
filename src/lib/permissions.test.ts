import { describe, expect, it } from 'vitest';
import {
  canAccessModule,
  formatarPerfil,
  hasPermission,
  moduloLabel,
  permissaoAjuda,
  permissaoTitulo,
  Permissoes,
} from '@/lib/permissions';

describe('permissions', () => {
  it('cenario3: sem FINANCEIRO_VISUALIZAR bloqueia módulo', () => {
    const perms = [Permissoes.DASHBOARD_VISUALIZAR, Permissoes.CLIENTES_VISUALIZAR];
    expect(canAccessModule(perms, 'FINANCEIRO')).toBe(false);
    expect(canAccessModule(perms, 'CLIENTES')).toBe(true);
  });

  it('painel do mês (módulo OBRIGACOES) exige ver obrigações', () => {
    expect(canAccessModule([Permissoes.OBRIGACOES_VISUALIZAR], 'OBRIGACOES')).toBe(true);
    expect(canAccessModule([Permissoes.CLIENTES_VISUALIZAR], 'OBRIGACOES')).toBe(false);
  });

  it('cenario2: honorário exige permissão específica', () => {
    expect(hasPermission([Permissoes.CLIENTES_VISUALIZAR], Permissoes.HONORARIO_VISUALIZAR)).toBe(false);
    expect(hasPermission([Permissoes.HONORARIO_VISUALIZAR], Permissoes.HONORARIO_VISUALIZAR)).toBe(true);
  });
});

const CODIGOS_DO_BANCO = [
  'DASHBOARD_VISUALIZAR', 'CONSULTAS_VISUALIZAR', 'CLIENTES_VISUALIZAR', 'CLIENTES_CADASTRAR',
  'CLIENTES_EDITAR', 'CLIENTES_EXCLUIR', 'CLIENTES_RESPONSAVEIS_EDITAR', 'OBRIGACOES_VISUALIZAR',
  'OBRIGACOES_CRIAR', 'OBRIGACOES_EDITAR', 'OBRIGACOES_CONCLUIR', 'OBRIGACOES_EXCLUIR',
  'OBRIGACOES_REABRIR', 'OBRIGACOES_TIPOS_GERENCIAR', 'FINANCEIRO_VISUALIZAR', 'FINANCEIRO_LANCAR',
  'FINANCEIRO_EDITAR', 'FINANCEIRO_EXCLUIR', 'HONORARIO_VISUALIZAR', 'HONORARIO_EDITAR',
  'DESPESAS_VISUALIZAR', 'DESPESAS_EDITAR', 'USUARIOS_VISUALIZAR', 'USUARIOS_CADASTRAR',
  'USUARIOS_EDITAR', 'USUARIOS_DESATIVAR', 'USUARIOS_PERMISSOES', 'RELATORIOS_OPERACIONAIS',
  'RELATORIOS_FINANCEIROS', 'RELATORIOS_EXPORTAR', 'ADMINISTRACAO_VISUALIZAR', 'ALCADA_GLOBAL',
  'ALCADA_SETOR', 'VISAO_GERENCIAL', 'CERTIFICADO_A1_GERENCIAR',
];

describe('textos de permissões', () => {
  it.each(CODIGOS_DO_BANCO)('%s tem título e ajuda legíveis', (codigo) => {
    expect(permissaoTitulo(codigo)).not.toMatch(/_/);
    expect(permissaoTitulo(codigo)).not.toBe(codigo);
    expect(permissaoAjuda(codigo)).toBeTruthy();
  });

  it('usa nomes claros para a equipe', () => {
    expect(permissaoTitulo('USUARIOS_VISUALIZAR')).toBe('Visualizar usuários');
    expect(permissaoTitulo('USUARIOS_DESATIVAR')).toBe('Excluir usuários');
  });

  it('nunca exibe código cru em permissão nova', () => {
    expect(permissaoTitulo('RELATORIOS_NOVO', 'Relatório novo')).toBe('Relatório novo');
    expect(permissaoTitulo('RELATORIOS_NOVO')).toBe('Relatórios novo');
  });

  it('formata módulos e perfis', () => {
    expect(moduloLabel('OBRIGACOES')).toBe('Obrigações');
    expect(moduloLabel('HONORARIOS')).toBe('Honorários');
    expect(formatarPerfil('SUPERVISOR_FISCAL')).toBe('Supervisor fiscal');
    expect(formatarPerfil('ADMIN')).toBe('Administrador');
    expect(formatarPerfil('SOCIO')).toBe('Sócio');
  });
});
