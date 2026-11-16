import { describe, expect, it } from 'vitest';
import {
  dataDaConsulta,
  descreverEvento,
  linkParabens,
  montarCalendario,
  sugerirProfissao,
  type DataEspecial,
  type Profissao,
} from './datasEspeciais';

const evento = (o: Partial<DataEspecial>): DataEspecial => ({
  data: '2026-10-25', tipo: 'DIA_PROFISSAO', clienteId: 1, clienteNome: 'Sorriso', pessoa: 'Ana Souza',
  profissao: 'Dentista', anos: null, telefone: '(85) 98888-7777', ...o,
});

const profissoes: Profissao[] = [
  { id: 1, nome: 'Dentista', dia: 25, mes: 10, cnaePrefixos: '8630504', ativo: true },
  { id: 2, nome: 'Comerciante', dia: 16, mes: 7, cnaePrefixos: '45,46,47', ativo: true },
  { id: 3, nome: 'Farmacêutico', dia: 20, mes: 1, cnaePrefixos: '4771', ativo: true },
  { id: 4, nome: 'Antiga', dia: 1, mes: 1, cnaePrefixos: '8630', ativo: false },
];

describe('montarCalendario', () => {
  it('monta as semanas do mês começando no domingo, com os eventos em cada dia', () => {
    const semanas = montarCalendario(2026, 10, [evento({}), evento({ data: '2026-10-05', tipo: 'ANIVERSARIO_EMPRESA', anos: 7 })]);
    // 01/10/2026 é quinta-feira: domingo a quarta ficam vazios
    expect(semanas[0].slice(0, 4).every((d) => d === null)).toBe(true);
    expect(semanas[0][4]?.dia).toBe(1);
    const dia25 = semanas.flat().find((d) => d?.dia === 25);
    expect(dia25?.eventos).toHaveLength(1);
    expect(semanas.flat().find((d) => d?.dia === 5)?.eventos[0].tipo).toBe('ANIVERSARIO_EMPRESA');
    expect(semanas.every((s) => s.length === 7)).toBe(true);
    expect(semanas.flat().filter(Boolean)).toHaveLength(31);
  });
});

describe('descreverEvento', () => {
  it('diz o que acontece no dia, para o balão do calendário', () => {
    expect(descreverEvento(evento({}))).toBe('Dia do Dentista: Sorriso');
    expect(descreverEvento(evento({ tipo: 'ANIVERSARIO_RESPONSAVEL' }))).toBe('Aniversário de Ana Souza (Sorriso)');
    expect(descreverEvento(evento({ tipo: 'ANIVERSARIO_EMPRESA', anos: 7 }))).toBe('Sorriso faz 7 anos de empresa');
    expect(descreverEvento(evento({ tipo: 'ANIVERSARIO_RESPONSAVEL', pessoa: null }))).toBe('Aniversário do responsável (Sorriso)');
  });

  it('dia da profissão sem cliente vinculado mostra só a data comemorativa', () => {
    expect(descreverEvento(evento({ clienteId: null, clienteNome: null, pessoa: null, telefone: null, profissao: 'Psicólogo' })))
      .toBe('Dia do Psicólogo');
  });
});

describe('linkParabens', () => {
  it('abre o WhatsApp com a mensagem de parabéns pronta', () => {
    const link = linkParabens(evento({ tipo: 'ANIVERSARIO_RESPONSAVEL' }));
    expect(link?.startsWith('https://wa.me/5585988887777?text=')).toBe(true);
    expect(decodeURIComponent(link!.split('text=')[1])).toContain('Feliz aniversário, Ana');
    expect(decodeURIComponent(linkParabens(evento({}))!.split('text=')[1])).toContain('Feliz Dia do Dentista');
  });

  it('sem telefone válido não tem botão', () => {
    expect(linkParabens(evento({ telefone: null }))).toBeNull();
    expect(linkParabens(evento({ telefone: '9999' }))).toBeNull();
    expect(linkParabens(evento({ clienteId: null, clienteNome: null, telefone: null }))).toBeNull();
  });
});

describe('sugerirProfissao', () => {
  it('acha a profissão pelo CNAE, preferindo o prefixo mais específico', () => {
    expect(sugerirProfissao(profissoes, '86.30-5-04')?.nome).toBe('Dentista');
    expect(sugerirProfissao(profissoes, '47.71-7-01')?.nome).toBe('Farmacêutico');
    expect(sugerirProfissao(profissoes, '47.11-3-01')?.nome).toBe('Comerciante');
  });

  it('ignora profissão desativada e CNAE sem par', () => {
    expect(sugerirProfissao(profissoes, '86.30-5-01')).toBeUndefined();
    expect(sugerirProfissao(profissoes, '')).toBeUndefined();
    expect(sugerirProfissao(profissoes, undefined)).toBeUndefined();
  });
});

describe('dataDaConsulta', () => {
  it('converte a data da Receita (dd/mm/aaaa) para o campo de data', () => {
    expect(dataDaConsulta('05/10/2019')).toBe('2019-10-05');
    expect(dataDaConsulta('-')).toBe('');
    expect(dataDaConsulta(undefined)).toBe('');
  });
});
