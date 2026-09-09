import { useAuth } from '@/contexts/AuthContext';

interface PermissionRouteProps {
  module: string;
  children: React.ReactNode;
}

/** Bloqueia rota no frontend; backend continua sendo a autoridade. */
export default function PermissionRoute({ module, children }: PermissionRouteProps) {
  const { canModule, permissoes } = useAuth();

  if (permissoes.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">Carregando permissões…</div>;
  }

  if (!canModule(module)) {
    return (
      <div className="page-shell">
        <h1 className="text-xl font-semibold">Acesso negado</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Você não possui permissão para acessar este módulo.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
