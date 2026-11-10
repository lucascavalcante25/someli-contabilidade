import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import PainelQuadro from './PainelQuadro';
import { montarMatriz, type OcorrenciaPainel } from '@/lib/painelMensal';

vi.mock('@/components/clientes/FichaClienteAcessos', () => ({
  AcessosLista: ({ clienteId }: { clienteId: number }) => <p>Lista de acessos do cliente {clienteId}</p>,
  AnotacoesLista: ({ clienteId }: { clienteId: number }) => <p>Lista de anotações do cliente {clienteId}</p>,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));
vi.mock('@/components/painel/AdicionarItemChecklist', () => ({
  default: () => <button type="button">Adicionar item</button>,
}));

const base = (o: Partial<OcorrenciaPainel>): OcorrenciaPainel => ({
  id: 1, clienteId: 1, clienteNome: 'Fra Carnes', obrigacaoNome: 'PGDAS-D', setor: 'FISCAL', competencia: '2026-10',
  dataVencimento: '2026-11-20', status: 'PENDENTE', concluidaEm: null, concluidaPorNome: null, ...o,
});

const matriz = montarMatriz([
  base({ id: 1, status: 'CONCLUIDA', concluidaPorNome: 'Ana Karoline', concluidaEm: '2026-11-06T14:05:00' }),
  base({ id: 2, obrigacaoNome: 'Pró-labore', dataVencimento: '2026-11-05' }),
  base({ id: 3, obrigacaoNome: 'DAS', status: 'NAO_APLICAVEL' }),
  base({ id: 4, clienteId: 2, clienteNome: 'Açai Timbu' }),
]);

function renderizar(onAlternar = vi.fn()) {
  render(
    <TooltipProvider>
      <PainelQuadro matriz={matriz} competencia="2026-10" hoje="2026-11-10" salvando={new Set()} onAlternar={onAlternar} />
    </TooltipProvider>,
  );
  return onAlternar;
}

function renderizarComSegmento(onMoverSegmento?: (clienteId: number, segmento: 'SERVICOS' | 'COMERCIO_INDUSTRIA') => void) {
  render(
    <TooltipProvider>
      <PainelQuadro
        matriz={matriz}
        competencia="2026-10"
        hoje="2026-11-10"
        salvando={new Set()}
        onAlternar={vi.fn()}
        segmentos={{ 1: 'COMERCIO_INDUSTRIA' }}
        onMoverSegmento={onMoverSegmento}
      />
    </TooltipProvider>,
  );
}

function soltar(cartao: HTMLElement, lista: HTMLElement) {
  const dados: Record<string, string> = {};
  const dataTransfer = {
    setData: (t: string, v: string) => { dados[t] = v; },
    getData: (t: string) => dados[t] ?? '',
    effectAllowed: 'move',
    dropEffect: 'move',
    types: ['text/plain'],
  };
  fireEvent.dragStart(cartao, { dataTransfer });
  fireEvent.dragOver(lista, { dataTransfer });
  fireEvent.drop(lista, { dataTransfer });
}

describe('PainelQuadro · aguardando cliente', () => {
  const comAguardando = montarMatriz([
    base({ id: 7, obrigacaoNome: 'Folha de pagamento', status: 'AGUARDANDO_CLIENTE' }),
    base({ id: 8, obrigacaoNome: 'DCTFWeb' }),
  ]);

  function abrir(onAguardar = vi.fn()) {
    render(
      <TooltipProvider>
        <PainelQuadro matriz={comAguardando} competencia="2026-10" hoje="2026-11-10" salvando={new Set()}
          onAlternar={vi.fn()} onAguardarCliente={onAguardar} />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ }));
    return { dialogo: screen.getByRole('dialog'), onAguardar };
  }

  it('marca um item pendente como aguardando o cliente (o que antes só a Fila de trabalho fazia)', () => {
    const { dialogo, onAguardar } = abrir();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'DCTFWeb: marcar aguardando cliente' }));
    expect(onAguardar).toHaveBeenCalledWith(expect.objectContaining({ id: 8 }), true);
  });

  it('item aguardando mostra o aviso e pode voltar a pendente', () => {
    const { dialogo, onAguardar } = abrir();
    expect(within(dialogo).getByText('Aguardando cliente')).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Folha de pagamento: tirar de aguardando cliente' }));
    expect(onAguardar).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }), false);
  });

  it('o cartão avisa que há item aguardando o cliente', () => {
    render(
      <TooltipProvider>
        <PainelQuadro matriz={comAguardando} competencia="2026-10" hoje="2026-11-10" salvando={new Set()} onAlternar={vi.fn()} />
      </TooltipProvider>,
    );
    expect(within(screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ })).getByText('Aguardando cliente')).toBeTruthy();
  });
});

describe('PainelQuadro · segmento', () => {
  it('arrastar o cartão para a lista do outro segmento grava o segmento do cliente', () => {
    const onMover = vi.fn();
    renderizarComSegmento(onMover);
    const cartao = screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ });
    soltar(cartao.closest('li')!, screen.getByRole('region', { name: 'Lista Em andamento · Serviços' }));
    expect(onMover).toHaveBeenCalledWith(1, 'SERVICOS');
  });

  it('soltar em Concluídos não muda o segmento (Concluídos depende do checklist)', () => {
    const onMover = vi.fn();
    renderizarComSegmento(onMover);
    const cartao = screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ });
    soltar(cartao.closest('li')!, screen.getByRole('region', { name: 'Lista Concluídos' }));
    expect(onMover).not.toHaveBeenCalled();
  });

  it('cliente sem segmento mostra "Segmento a confirmar" no cartão', () => {
    renderizarComSegmento(vi.fn());
    const semTag = screen.getByRole('button', { name: /Abrir cartão de Açai Timbu/ });
    expect(within(semTag).getByText('Segmento a confirmar')).toBeTruthy();
    const comTag = screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ });
    expect(within(comTag).queryByText('Segmento a confirmar')).toBeNull();
  });

  it('sem permissão de editar cliente o cartão não arrasta', () => {
    renderizarComSegmento(undefined);
    const cartao = screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ });
    expect(cartao.closest('li')!.getAttribute('draggable')).not.toBe('true');
  });

  it('no cartão aberto dá para trocar o segmento com um toque (celular não arrasta)', () => {
    const onMover = vi.fn();
    renderizarComSegmento(onMover);
    fireEvent.click(screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByRole('radio', { name: 'Comércio e Indústria' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Serviços' }));
    expect(onMover).toHaveBeenCalledWith(1, 'SERVICOS');
  });
});

describe('PainelQuadro', () => {
  it('cada cliente é um cartão com o andamento do checklist', () => {
    renderizar();
    const cartao = screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ });
    expect(within(cartao).getByText('1/2')).toBeTruthy();
    expect(within(cartao).getByText('Atrasada')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Abrir cartão de Açai Timbu/ })).toBeTruthy();
  });

  it('ao clicar abre o cartão com o checklist do mês, quem fez e o que não se aplica', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText('Fra Carnes')).toBeTruthy();
    expect(within(dialogo).getByRole('checkbox', { name: /PGDAS-D/ }).getAttribute('data-state')).toBe('checked');
    expect(within(dialogo).getByText(/Ana Karoline/)).toBeTruthy();
    expect(within(dialogo).getByRole('checkbox', { name: /Pró-labore/ }).getAttribute('data-state')).toBe('unchecked');
    expect(within(dialogo).getByText('Não se aplica')).toBeTruthy();
    expect(within(dialogo).getByText('50%')).toBeTruthy();
  });

  it('marcar o item no cartão salva a atividade', () => {
    const onAlternar = renderizar();
    fireEvent.click(screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox', { name: /Pró-labore/ }));
    expect(onAlternar).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), true);
  });

  it('pode ocultar os itens já marcados, como no Trello', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Ocultar itens marcados' }));
    expect(within(dialogo).queryByRole('checkbox', { name: /PGDAS-D/ })).toBeNull();
    expect(within(dialogo).getByRole('checkbox', { name: /Pró-labore/ })).toBeTruthy();
  });

  it('o cartão é um só, crescendo para baixo: checklist, acessos e anotações, sem abas', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /Abrir cartão de Fra Carnes/ }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).queryByRole('tab')).toBeNull();
    const titulos = within(dialogo).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titulos).toEqual(['Checklist do mês', 'Acessos', 'Anotações']);
    expect(within(dialogo).getByText('Lista de acessos do cliente 1')).toBeTruthy();
    expect(within(dialogo).getByText('Lista de anotações do cliente 1')).toBeTruthy();
    expect(within(dialogo).getByRole('button', { name: 'Adicionar item' })).toBeTruthy();
  });
});
