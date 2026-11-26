import { Plus, Trash2 } from 'lucide-react';
import AppSelect from '@/components/shared/AppSelect';
import Campo, { classeInput } from './Campo';
import { itemRegimeRegularVazio, type FormRegimeRegular, type ItemRegimeRegular } from '@/lib/simuladorRtc';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

interface Props {
  form: FormRegimeRegular;
  onChange: (form: FormRegimeRegular) => void;
}

export default function FormRegimeRegularCampos({ form, onChange }: Props) {
  const exigeAliquota = Number(form.data.slice(0, 4)) >= 2027;
  const alterarItem = (indice: number, item: ItemRegimeRegular) =>
    onChange({ ...form, itens: form.itens.map((atual, i) => (i === indice ? item : atual)) });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Data do fato gerador">
          <input type="date" value={form.data} onChange={(e) => onChange({ ...form, data: e.target.value })} className={classeInput} />
        </Campo>
        <Campo rotulo="UF">
          <AppSelect value={form.uf} onChange={(uf) => onChange({ ...form, uf })} options={UFS.map((u) => ({ value: u, label: u }))} />
        </Campo>
        <Campo rotulo="Município (código IBGE)" ajuda="Fortaleza: 2304400">
          <input inputMode="numeric" maxLength={7} value={form.municipio}
            onChange={(e) => onChange({ ...form, municipio: e.target.value.replace(/\D/g, '') })} className={`${classeInput} tabular-nums`} />
        </Campo>
        <Campo rotulo="Documento" ajuda="Opcional. Se informado, a calculadora confere o vínculo da classificação.">
          <AppSelect value={form.tpDoc} allowEmpty onChange={(tpDoc) => onChange({ ...form, tpDoc })}
            options={[{ value: '', label: 'Não informar' }, { value: '55', label: 'NF-e (55)' }, { value: '65', label: 'NFC-e (65)' }]} />
        </Campo>
      </div>

      {exigeAliquota ? (
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground mb-2">
            A partir de 2027 a calculadora não traz alíquota de referência: informe as alíquotas nominais (%).
            Os valores iniciais são os do exemplo da documentação da Receita. Confirme a alíquota vigente antes de usar.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo rotulo="CBS (%)">
              <input inputMode="decimal" value={form.aliquotas.cbs} className={`${classeInput} tabular-nums`}
                onChange={(e) => onChange({ ...form, aliquotas: { ...form.aliquotas, cbs: e.target.value } })} />
            </Campo>
            <Campo rotulo="IBS estadual (%)">
              <input inputMode="decimal" value={form.aliquotas.ibsEstadual} className={`${classeInput} tabular-nums`}
                onChange={(e) => onChange({ ...form, aliquotas: { ...form.aliquotas, ibsEstadual: e.target.value } })} />
            </Campo>
            <Campo rotulo="IBS municipal (%)">
              <input inputMode="decimal" value={form.aliquotas.ibsMunicipal} className={`${classeInput} tabular-nums`}
                onChange={(e) => onChange({ ...form, aliquotas: { ...form.aliquotas, ibsMunicipal: e.target.value } })} />
            </Campo>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Em 2026 a calculadora usa as alíquotas de teste da tabela dela (CBS 0,9% e IBS 0,1%).
        </p>
      )}

      <div className="space-y-3">
        {form.itens.map((item, indice) => (
          <div key={indice} className="rounded-md border border-border p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Item {indice + 1}</span>
              {form.itens.length > 1 && (
                <button type="button" onClick={() => onChange({ ...form, itens: form.itens.filter((_, i) => i !== indice) })}
                  className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                  <Trash2 size={14} /> Remover
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo rotulo="NCM (mercadoria)" ajuda="8 dígitos. Use NCM ou NBS.">
                <input inputMode="numeric" maxLength={10} value={item.ncm} className={`${classeInput} tabular-nums`}
                  onChange={(e) => alterarItem(indice, { ...item, ncm: e.target.value })} />
              </Campo>
              <Campo rotulo="NBS (serviço)" ajuda="9 dígitos.">
                <input inputMode="numeric" maxLength={12} value={item.nbs} className={`${classeInput} tabular-nums`}
                  onChange={(e) => alterarItem(indice, { ...item, nbs: e.target.value })} />
              </Campo>
              <Campo rotulo="CST IBS/CBS" ajuda="000 integral, 200 com redução, 410 imunidade…">
                <input inputMode="numeric" maxLength={3} value={item.cst} className={`${classeInput} tabular-nums`}
                  onChange={(e) => alterarItem(indice, { ...item, cst: e.target.value.replace(/\D/g, '') })} />
              </Campo>
              <Campo rotulo="Classificação (cClassTrib)" ajuda="6 dígitos, tabela da IT 2025.002.">
                <input inputMode="numeric" maxLength={6} value={item.cClassTrib} className={`${classeInput} tabular-nums`}
                  onChange={(e) => alterarItem(indice, { ...item, cClassTrib: e.target.value.replace(/\D/g, '') })} />
              </Campo>
              <Campo rotulo="Base de cálculo (R$)" ajuda={item.impostoSeletivo ? 'Pode ficar vazia: a calculadora soma base do IS + IS.' : undefined}>
                <input inputMode="decimal" value={item.baseCalculo} className={`${classeInput} tabular-nums`}
                  onChange={(e) => alterarItem(indice, { ...item, baseCalculo: e.target.value })} />
              </Campo>
              <Campo rotulo="Quantidade">
                <input inputMode="decimal" value={item.quantidade ?? ''} className={`${classeInput} tabular-nums`}
                  onChange={(e) => alterarItem(indice, { ...item, quantidade: e.target.value })} />
              </Campo>
              <Campo rotulo="Unidade" ajuda="Ex.: UN, KG, LT">
                <input maxLength={6} value={item.unidade ?? ''} className={classeInput}
                  onChange={(e) => alterarItem(indice, { ...item, unidade: e.target.value.toUpperCase() })} />
              </Campo>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={!!item.impostoSeletivo}
                  onChange={(e) => alterarItem(indice, {
                    ...item,
                    impostoSeletivo: e.target.checked
                      ? { cst: '000', cClassTrib: '000001', baseCalculo: '', impostoInformado: '', aliquotaAdValorem: '' }
                      : null,
                  })} />
                Tem Imposto Seletivo
              </label>
            </div>
            {item.impostoSeletivo && (
              <div className="grid grid-cols-1 gap-3 rounded-md bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-5">
                <Campo rotulo="CST do IS">
                  <input inputMode="numeric" maxLength={3} value={item.impostoSeletivo.cst} className={`${classeInput} tabular-nums`}
                    onChange={(e) => alterarItem(indice, { ...item, impostoSeletivo: { ...item.impostoSeletivo!, cst: e.target.value.replace(/\D/g, '') } })} />
                </Campo>
                <Campo rotulo="cClassTrib do IS">
                  <input inputMode="numeric" maxLength={6} value={item.impostoSeletivo.cClassTrib} className={`${classeInput} tabular-nums`}
                    onChange={(e) => alterarItem(indice, { ...item, impostoSeletivo: { ...item.impostoSeletivo!, cClassTrib: e.target.value.replace(/\D/g, '') } })} />
                </Campo>
                <Campo rotulo="Base do IS (R$)">
                  <input inputMode="decimal" value={item.impostoSeletivo.baseCalculo} className={`${classeInput} tabular-nums`}
                    onChange={(e) => alterarItem(indice, { ...item, impostoSeletivo: { ...item.impostoSeletivo!, baseCalculo: e.target.value } })} />
                </Campo>
                <Campo rotulo="IS informado (R$)" ajuda="Opcional.">
                  <input inputMode="decimal" value={item.impostoSeletivo.impostoInformado ?? ''} className={`${classeInput} tabular-nums`}
                    onChange={(e) => alterarItem(indice, { ...item, impostoSeletivo: { ...item.impostoSeletivo!, impostoInformado: e.target.value } })} />
                </Campo>
                <Campo rotulo="Alíquota IS (%)" ajuda="A partir de 2027.">
                  <input inputMode="decimal" value={item.impostoSeletivo.aliquotaAdValorem ?? ''} className={`${classeInput} tabular-nums`}
                    onChange={(e) => alterarItem(indice, { ...item, impostoSeletivo: { ...item.impostoSeletivo!, aliquotaAdValorem: e.target.value } })} />
                </Campo>
              </div>
            )}
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...form, itens: [...form.itens, itemRegimeRegularVazio()] })}
          disabled={form.itens.length >= 50}
          className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">
          <Plus size={16} /> Adicionar item
        </button>
      </div>
    </div>
  );
}
