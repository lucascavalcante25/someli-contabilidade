import { useId, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { correspondeBusca, type ClienteBuscavel } from '@/lib/buscaClientes';
import { rotuloRegime } from '@/lib/classificacao';

export interface ClienteParaBusca extends ClienteBuscavel {
  id: number;
}

interface BuscaRapidaClienteProps {
  clientes: ClienteParaBusca[];
  onAbrir: (clienteId: number) => void;
}

const LIMITE = 8;

/** Lupa do Dashboard: acha a empresa pelo nome, CNPJ ou tag e abre direto nas obrigações. */
export default function BuscaRapidaCliente({ clientes, onAbrir }: BuscaRapidaClienteProps) {
  const [termo, setTermo] = useState('');
  const listaId = useId();
  const resultados = useMemo(
    () => (termo.trim() ? clientes.filter((c) => correspondeBusca(c, termo)).slice(0, LIMITE) : []),
    [clientes, termo]
  );

  const abrir = (id: number) => {
    setTermo('');
    onAbrir(id);
  };

  return (
    <div className="relative w-full sm:max-w-sm">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        role="combobox"
        aria-label="Buscar empresa"
        aria-expanded={!!termo.trim()}
        aria-controls={listaId}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && resultados[0]) abrir(resultados[0].id);
          if (e.key === 'Escape') setTermo('');
        }}
        placeholder="Buscar empresa (nome, CNPJ, tag)..."
        className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
      {termo.trim() && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg"
        >
          {resultados.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Nenhuma empresa encontrada</li>
          ) : (
            resultados.map((c) => (
              <li key={c.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => abrir(c.id)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
                >
                  <span className="w-full truncate text-sm font-medium">{c.nomeFantasia || c.razaoSocial}</span>
                  <span className="w-full truncate text-xs text-muted-foreground">
                    {c.nomeFantasia ? c.razaoSocial : ''}
                    {c.regimeTributario ? ` · ${rotuloRegime(c.regimeTributario)}` : ''}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
