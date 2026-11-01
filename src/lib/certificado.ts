/** Status operacional do certificado digital do cliente. */

export type CertificadoStatus = 'OK' | 'VENCENDO' | 'VENCIDO' | 'NAO_INFORMADO';

export const CERTIFICADO_DIAS_ALERTA = 30;

export function certificadoStatusLabel(status?: string | null): string {
  switch (status) {
    case 'VENCIDO':
      return 'Cert. vencido';
    case 'VENCENDO':
      return 'Cert. vencendo';
    case 'OK':
      return 'Cert. ok';
    default:
      return 'Sem certificado';
  }
}

export function certificadoBadgeClass(status?: string | null): string {
  switch (status) {
    case 'VENCIDO':
      return 'bg-destructive/15 text-destructive';
    case 'VENCENDO':
      return 'bg-warning/15 text-warning';
    case 'OK':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function formatCertificadoResumo(opts: {
  status?: string | null;
  vencimento?: string | null;
  tipo?: string | null;
  diasRestantes?: number | null;
}): string {
  if (!opts.vencimento) return 'Não informado';
  const data = new Date(opts.vencimento + 'T12:00:00').toLocaleDateString('pt-BR');
  const tipo = opts.tipo ? ` ${opts.tipo}` : '';
  if (opts.status === 'VENCIDO') {
    const dias = opts.diasRestantes != null ? Math.abs(Number(opts.diasRestantes)) : null;
    return `Vencido${tipo} em ${data}${dias != null ? ` (há ${dias}d)` : ''}`;
  }
  if (opts.status === 'VENCENDO') {
    return `Vence${tipo} em ${data}${opts.diasRestantes != null ? ` (${opts.diasRestantes}d)` : ''}`;
  }
  return `Válido${tipo} até ${data}`;
}
