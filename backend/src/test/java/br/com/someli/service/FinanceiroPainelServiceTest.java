package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.ClientePagamentoDTO;
import br.com.someli.dto.PainelFinanceiroDTO;
import br.com.someli.dto.ResumoFinanceiroDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.repository.ClienteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FinanceiroPainelServiceTest {

    @Mock private FinanceiroService financeiroService;
    @Mock private ClienteRepository clienteRepository;
    @Mock private AuthorizationService authorizationService;

    private FinanceiroPainelService service;
    private static final LocalDate HOJE = LocalDate.of(2026, 3, 10);

    @BeforeEach
    void setUp() {
        service = new FinanceiroPainelService(financeiroService, clienteRepository, authorizationService);
    }

    private ResumoFinanceiroDTO resumo(String prevista, String recebida, String despesas) {
        ResumoFinanceiroDTO r = new ResumoFinanceiroDTO();
        r.setReceitaTotal(new BigDecimal(prevista));
        r.setReceitaRecebida(new BigDecimal(recebida));
        r.setDespesasPagas(new BigDecimal(despesas));
        r.setClientes(List.of());
        return r;
    }

    private ClientePagamentoDTO devedor(long id, String nome, String valor, int meses) {
        ClientePagamentoDTO c = new ClientePagamentoDTO();
        c.setId(id);
        c.setNomeFantasia(nome);
        c.setValorPendente(new BigDecimal(valor));
        c.setMesesPendentes(meses);
        return c;
    }

    private Cliente cliente(long id, String nome, LocalDate inicio, String honorario) {
        Cliente c = new Cliente();
        c.setId(id);
        c.setRazaoSocial(nome);
        c.setAtivo(true);
        c.setDataInicioCobranca(inicio);
        c.setHonorario(new BigDecimal(honorario));
        return c;
    }

    @Test
    void semPermissao_nega() {
        doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.FINANCEIRO_VISUALIZAR);

        assertThatThrownBy(() -> service.obter(2026, HOJE)).isInstanceOf(AcessoNegadoException.class);

        verify(financeiroService, never()).obterResumo(anyInt(), anyInt());
    }

    @Test
    void somaApenasMesesAteOAtualNoAnoCorrente() {
        when(financeiroService.obterResumo(anyInt(), eq(2026))).thenReturn(resumo("1000", "800", "300"));
        when(clienteRepository.findAll()).thenReturn(List.of());

        PainelFinanceiroDTO painel = service.obter(2026, HOJE);

        assertThat(painel.meses()).hasSize(3);
        assertThat(painel.recebidoNoAno()).isEqualByComparingTo("2400");
        assertThat(painel.despesasNoAno()).isEqualByComparingTo("900");
        assertThat(painel.resultadoNoAno()).isEqualByComparingTo("1500");
        assertThat(painel.margemPercentual()).isEqualByComparingTo("62.5");
        assertThat(painel.meses().get(0).resultado()).isEqualByComparingTo("500");
    }

    @Test
    void semReceita_margemZeroSemDividirPorZero() {
        when(financeiroService.obterResumo(anyInt(), eq(2026))).thenReturn(resumo("0", "0", "300"));
        when(clienteRepository.findAll()).thenReturn(List.of());

        assertThat(service.obter(2026, HOJE).margemPercentual()).isEqualByComparingTo("0");
    }

    @Test
    void inadimplencia_vemDoMesCorrenteOrdenadaPorValor() {
        ResumoFinanceiroDTO atual = resumo("1000", "0", "0");
        atual.setClientes(List.of(devedor(1, "Pequena", "100", 1), devedor(2, "Grande", "900", 3), devedor(3, "Em dia", "0", 0)));
        when(financeiroService.obterResumo(anyInt(), eq(2026))).thenReturn(resumo("0", "0", "0"));
        when(financeiroService.obterResumo(3, 2026)).thenReturn(atual);
        when(clienteRepository.findAll()).thenReturn(List.of());

        PainelFinanceiroDTO painel = service.obter(2026, HOJE);

        assertThat(painel.totalEmAberto()).isEqualByComparingTo("1000");
        assertThat(painel.inadimplentes()).hasSize(2);
        assertThat(painel.inadimplentes().get(0).nome()).isEqualTo("Grande");
    }

    @Test
    void reajuste_listaAniversarioNosProximos60Dias() {
        when(financeiroService.obterResumo(anyInt(), eq(2026))).thenReturn(resumo("0", "0", "0"));
        Cliente proximo = cliente(1, "Proximo", LocalDate.of(2024, 4, 1), "500");
        Cliente longe = cliente(2, "Longe", LocalDate.of(2024, 9, 1), "500");
        Cliente novo = cliente(3, "Novo", LocalDate.of(2026, 3, 1), "500");
        Cliente inativo = cliente(4, "Inativo", LocalDate.of(2024, 4, 1), "500");
        inativo.setAtivo(false);
        when(clienteRepository.findAll()).thenReturn(List.of(proximo, longe, novo, inativo));

        PainelFinanceiroDTO painel = service.obter(2026, HOJE);

        assertThat(painel.reajustes()).hasSize(1);
        assertThat(painel.reajustes().get(0).nome()).isEqualTo("Proximo");
        assertThat(painel.reajustes().get(0).dataReajuste()).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(painel.reajustes().get(0).anosDeContrato()).isEqualTo(2);
    }
}
