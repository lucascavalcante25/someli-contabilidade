package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.Usuario;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

/** Inadimplentes no Dashboard: meses em aberto para marcar pagamento; valores só para quem vê o financeiro. */
@ExtendWith(MockitoExtension.class)
class AlertasOperacionaisServiceTest {

    @Mock ObrigacaoOcorrenciaRepository ocorrenciaRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock ClienteService clienteService;
    @Mock AuthorizationService authorizationService;

    AlertasOperacionaisService service;
    Usuario usuario = new Usuario();

    @BeforeEach
    void setUp() {
        service = new AlertasOperacionaisService(ocorrenciaRepository, clienteRepository, clienteService, authorizationService);
        Cliente c = new Cliente();
        c.setId(5L);
        c.setAtivo(true);
        c.setRazaoSocial("Bom Pão");
        c.setHonorario(new BigDecimal("380.00"));
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.clienteIdsNaAlcada(usuario)).thenReturn(null);
        when(ocorrenciaRepository.findAbertasComVencimentoAte(any())).thenReturn(List.of());
        when(clienteRepository.findAllWithResponsavel()).thenReturn(List.of(c));
        when(clienteService.indexarPagamentosPagos()).thenReturn(Map.of());
        when(clienteService.indexarMesesNaoCobraveis()).thenReturn(Map.of());
        doAnswer(inv -> {
            Cliente cli = inv.getArgument(0);
            cli.setStatus("atrasado");
            cli.setMesesPendentes(2);
            cli.setValorPendente(new BigDecimal("760.00"));
            cli.setMesesAbertos(List.of("2026-09", "2026-10"));
            return null;
        }).when(clienteService).enriquecerStatusPagamento(any(), any(), any(), any(), any());
    }

    @Test
    void comPermissaoFinanceira_trazMesesAbertosHonorarioEValor() {
        when(authorizationService.canViewFinancialData(usuario)).thenReturn(true);

        var item = service.obter().getInadimplentesItens().get(0);

        assertThat(item.getMesesAbertos()).containsExactly("2026-09", "2026-10");
        assertThat(item.getHonorario()).isEqualByComparingTo("380.00");
        assertThat(item.getValorPendente()).isEqualByComparingTo("760.00");
    }

    @Test
    void semPermissaoFinanceira_naoExpoeValores() {
        when(authorizationService.canViewFinancialData(usuario)).thenReturn(false);

        var item = service.obter().getInadimplentesItens().get(0);

        assertThat(item.getMesesPendentes()).isEqualTo(2);
        assertThat(item.getValorPendente()).isNull();
        assertThat(item.getHonorario()).isNull();
    }
}
