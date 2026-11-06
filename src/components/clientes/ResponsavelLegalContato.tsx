import { MessageCircle } from 'lucide-react';
import { formatarTelefone, linkWhatsApp } from '@/lib/whatsapp';

interface ResponsavelLegalContatoProps {
  nome?: string | null;
  telefone?: string | null;
}

/** Responsável legal do cliente com telefone e atalho para o WhatsApp (abre o wa.me em nova aba). */
export default function ResponsavelLegalContato({ nome, telefone }: ResponsavelLegalContatoProps) {
  const link = linkWhatsApp(telefone);
  const tel = formatarTelefone(telefone);
  if (!nome && !tel) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0">
        {nome && <span className="block truncate">{nome}</span>}
        {tel && <span className="block text-xs tabular-nums text-muted-foreground">{tel}</span>}
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Conversar com ${nome || 'o responsável'} no WhatsApp`}
          title="Abrir no WhatsApp"
          className="shrink-0 rounded-full p-1.5 text-emerald-600 hover:bg-emerald-500/10"
        >
          <MessageCircle size={16} />
        </a>
      )}
    </div>
  );
}
