import { Plus, Trash2 } from 'lucide-react';
import AppSelect from '@/components/shared/AppSelect';
import Campo, { classeInput } from './Campo';
import { ATIVIDADES_SIMPLES, DOCUMENTOS_SIMPLES, itemSimplesVazio, type DocumentoSimples, type FormSimples, type ItemSimples } from '@/lib/simuladorRtc';

interface Props {
  form: FormSimples;
  onChange: (form: FormSimples) => void;
}

export default function FormSimplesCampos({ form, onChange }: Props) {
  const nfse = form.documento === '91';
  const usaFatorR = form.itens.some((i) => i.cAtivSN === '09');
  const alterarItem = (indice: number, item: ItemSimples) =>
    onChange({ ...form, itens: form.itens.map((atual, i) => (i === indice ? item : atual)) });

  const trocarDocumento = (documento: string) => {
    const doc = documento as DocumentoSimples;
    // A NFS-e aceita exatamente um item na calculadora do Simples.
    onChange({ ...form, documento: doc, itens: doc === '91' ? form.itens.slice(0, 1) : form.itens });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Data do fato gerador" ajuda="O cálculo do Simples começa em 2027.">
          <input type="date" value={form.data} onChange={(e) => onChange({ ...form, data: e.target.value })} className={classeInput} />
        </Campo>
        <Campo rotulo="Documento">
          <AppSelect value={form.documento} onChange={trocarDocumento} options={DOCUMENTOS_SIMPLES} />
        </Campo>
        <Campo rotulo="Alíquota efetiva CBS (%)" ajuda="A do PGDAS-D do período, para o anexo da atividade.">
          <input inputMode="decimal" value={form.aliquotaCbs} className={`${classeInput} tabular-nums`}
            onChange={(e) => onChange({ ...form, aliquotaCbs: e.target.value })} />
        </Campo>
        <Campo rotulo="Alíquota efetiva IBS (%)">
          <input inputMode="decimal" value={form.aliquotaIbs} disabled={form.impedimentoSublimite}
            className={`${classeInput} tabular-nums disabled:opacity-50`}
            onChange={(e) => onChange({ ...form, aliquotaIbs: e.target.value })} />
        </Campo>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.impedimentoSublimite}
            onChange={(e) => onChange({ ...form, impedimentoSublimite: e.target.checked })} />
          Passou do sublimite (IBS fora do Simples)
        </label>
        {usaFatorR && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.fatorR} onChange={(e) => onChange({ ...form, fatorR: e.target.checked })} />
            Fator "r" igual ou acima de 28% (Anexo III)
          </label>
        )}
      </div>

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
              <Campo rotulo="Atividade do Simples (cAtivSN)" className="sm:col-span-2">
                <AppSelect value={item.cAtivSN} onChange={(cAtivSN) => alterarItem(indice, { ...item, cAtivSN })} options={ATIVIDADES_SIMPLES} />
              </Campo>
              <Campo rotulo="Classificação (cClassTrib)" ajuda="000001 = tributação integral.">
                <input inputMode="numeric" maxLength={6} value={item.cClassTrib} className={`${classeInput} tabular-nums`}
                  onChange={(e) => alterarItem(indice, { ...item, cClassTrib: e.target.value.replace(/\D/g, '') })} />
              </Campo>
              <Campo rotulo="Base de cálculo (R$)" ajuda={nfse ? 'Valor do serviço menos descontos incondicionais.' : 'Sem o valor do IS.'}>
                <input inputMode="decimal" value={item.baseCalculo} className={`${classeInput} tabular-nums`}
                  onChange={(e) => alterarItem(indice, { ...item, baseCalculo: e.target.value })} />
              </Campo>
              {nfse ? (
                <>
                  <Campo rotulo="NBS (serviço)">
                    <input inputMode="numeric" maxLength={12} value={item.nbs} className={`${classeInput} tabular-nums`}
                      onChange={(e) => alterarItem(indice, { ...item, nbs: e.target.value })} />
                  </Campo>
                  <Campo rotulo="Tributação do ISS">
                    <AppSelect value={item.tribISSQN ?? '1'} onChange={(tribISSQN) => alterarItem(indice, { ...item, tribISSQN })}
                      options={[
                        { value: '1', label: 'Tributável' },
                        { value: '2', label: 'Imunidade' },
                        { value: '3', label: 'Exportação de serviço' },
                        { value: '4', label: 'Não incidência' },
                      ]} />
                  </Campo>
                  <Campo rotulo="Retenção do ISS">
                    <AppSelect value={item.tpRetISSQN ?? '1'} onChange={(tpRetISSQN) => alterarItem(indice, { ...item, tpRetISSQN })}
                      options={[
                        { value: '1', label: 'Não retido' },
                        { value: '2', label: 'Retido pelo tomador' },
                        { value: '3', label: 'Retido pelo intermediário' },
                      ]} />
                  </Campo>
                </>
              ) : (
                <>
                  <Campo rotulo="NCM (mercadoria)">
                    <input inputMode="numeric" maxLength={10} value={item.ncm} className={`${classeInput} tabular-nums`}
                      onChange={(e) => alterarItem(indice, { ...item, ncm: e.target.value })} />
                  </Campo>
                  <Campo rotulo="Imposto Seletivo já calculado (R$)" ajuda="Vazio = sem IS. Só é repassado.">
                    <input inputMode="decimal" value={item.valorImpostoSeletivo} className={`${classeInput} tabular-nums`}
                      onChange={(e) => alterarItem(indice, { ...item, valorImpostoSeletivo: e.target.value })} />
                  </Campo>
                </>
              )}
            </div>
          </div>
        ))}
        {!nfse && (
          <button type="button" onClick={() => onChange({ ...form, itens: [...form.itens, itemSimplesVazio()] })}
            disabled={form.itens.length >= 50}
            className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">
            <Plus size={16} /> Adicionar item
          </button>
        )}
      </div>
    </div>
  );
}
