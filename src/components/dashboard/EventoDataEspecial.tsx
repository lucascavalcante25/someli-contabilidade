import { Briefcase, Building2, Cake, MessageCircle } from 'lucide-react';
import { COR_TIPO } from '@/components/dashboard/datasEspeciaisCores';
import { descreverEvento, linkParabens, type DataEspecial, type TipoDataEspecial } from '@/lib/datasEspeciais';
import { cn } from '@/lib/utils';

function Icone({ tipo }: { tipo: TipoDataEspecial }) {
  const classe = cn('h-4 w-4 shrink-0', COR_TIPO[tipo].icone);
  if (tipo === 'DIA_PROFISSAO') return <Briefcase className={classe} aria-hidden />;
  if (tipo === 'ANIVERSARIO_EMPRESA') return <Building2 className={classe} aria-hidden />;
  return <Cake className={classe} aria-hidden />;
}

/** Uma linha: o que é, de quem, e o atalho de parabéns pelo WhatsApp (mensagem pronta, sem envio automático). */
export default function EventoDataEspecial({ evento, mostrarData }: { evento: DataEspecial; mostrarData?: boolean }) {
  const link = linkParabens(evento);
  return (
    <li className="flex items-start gap-2.5 py-2">
      <Icone tipo={evento.tipo} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug break-words">{descreverEvento(evento)}</p>
        {mostrarData && (
          <p className="text-xs text-muted-foreground">{`${evento.data.slice(8, 10)}/${evento.data.slice(5, 7)}`}</p>
        )}
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Mandar parabéns: ${descreverEvento(evento)}`}
          title="Mandar parabéns pelo WhatsApp"
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          Parabéns
        </a>
      )}
    </li>
  );
}
