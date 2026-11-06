import { describe, expect, it } from 'vitest';
import { correspondeBusca, type ClienteBuscavel } from './buscaClientes';

const estrela: ClienteBuscavel = {
  razaoSocial: 'FLAVIO LOPES ALMEIDA LTDA',
  nomeFantasia: 'Estrela Ester Curitiba',
  cnpj: '56293580000107',
  proprietario: 'Flavio Lopes',
  email: '',
  regimeTributario: 'SIMPLES_NACIONAL',
  tags: [{ nome: 'SIMPLES_NACIONAL' }, { nome: 'INADIMPLENTE' }],
};

const acai: ClienteBuscavel = { ...estrela, razaoSocial: 'TIMBU ACAITERIA LTDA', nomeFantasia: 'Açai Timbu', tags: [] };

describe('correspondeBusca', () => {
  it('busca vazia traz todos', () => {
    expect(correspondeBusca(estrela, '')).toBe(true);
    expect(correspondeBusca(estrela, '   ')).toBe(true);
  });

  it('acha pelo nome fantasia (nome da planilha)', () => {
    expect(correspondeBusca(estrela, 'estrela')).toBe(true);
    expect(correspondeBusca(estrela, 'Curitiba')).toBe(true);
  });

  it('acha pela razão social e pelo sócio', () => {
    expect(correspondeBusca(estrela, 'flavio lopes')).toBe(true);
  });

  it('ignora acento nos dois lados', () => {
    expect(correspondeBusca(acai, 'acai')).toBe(true);
    expect(correspondeBusca(acai, 'açaí')).toBe(true);
  });

  it('CNPJ com ou sem pontuação', () => {
    expect(correspondeBusca(estrela, '56.293.580')).toBe(true);
    expect(correspondeBusca(estrela, '56293580')).toBe(true);
  });

  it('tag e regime escritos com espaço', () => {
    expect(correspondeBusca(estrela, 'simples nacional')).toBe(true);
    expect(correspondeBusca(estrela, 'inadimplente')).toBe(true);
  });

  it('não acha o que não existe', () => {
    expect(correspondeBusca(estrela, 'lucro real')).toBe(false);
    expect(correspondeBusca(estrela, '999')).toBe(false);
  });
});
