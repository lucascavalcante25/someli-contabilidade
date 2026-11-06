import AppSelect from '@/components/shared/AppSelect';
import { SETORES_DO_CLIENTE, type ResponsaveisPorSetor } from '@/lib/responsaveis';

interface ResponsaveisSetorFieldsProps {
  value: ResponsaveisPorSetor;
  usuarios: { id: number; nome: string }[];
  onChange: (value: ResponsaveisPorSetor) => void;
  somenteLeitura?: boolean;
}

/** Um usuário do sistema por setor (todos opcionais). Define quem vê o cliente no painel do mês. */
export default function ResponsaveisSetorFields({ value, usuarios, onChange, somenteLeitura }: ResponsaveisSetorFieldsProps) {
  const opcoes = [{ value: '', label: 'Sem responsável' }, ...usuarios.map((u) => ({ value: String(u.id), label: u.nome }))];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SETORES_DO_CLIENTE.map((s) => (
        <div key={s.value} className="space-y-1.5">
          <label className="label-text">{s.label}</label>
          <AppSelect
            value={value[s.value] != null ? String(value[s.value]) : ''}
            onChange={(v) => onChange({ ...value, [s.value]: v ? Number(v) : null })}
            allowEmpty
            placeholder="Sem responsável"
            disabled={somenteLeitura}
            options={opcoes}
          />
        </div>
      ))}
    </div>
  );
}
