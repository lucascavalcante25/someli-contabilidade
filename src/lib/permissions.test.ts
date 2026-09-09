import { describe, expect, it } from 'vitest';
import { canAccessModule, hasPermission, Permissoes } from '@/lib/permissions';

describe('permissions', () => {
  it('cenario3: sem FINANCEIRO_VISUALIZAR bloqueia módulo', () => {
    const perms = [Permissoes.DASHBOARD_VISUALIZAR, Permissoes.CLIENTES_VISUALIZAR];
    expect(canAccessModule(perms, 'FINANCEIRO')).toBe(false);
    expect(canAccessModule(perms, 'CLIENTES')).toBe(true);
  });

  it('cenario2: honorário exige permissão específica', () => {
    expect(hasPermission([Permissoes.CLIENTES_VISUALIZAR], Permissoes.HONORARIO_VISUALIZAR)).toBe(false);
    expect(hasPermission([Permissoes.HONORARIO_VISUALIZAR], Permissoes.HONORARIO_VISUALIZAR)).toBe(true);
  });
});
