package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.PagamentoMensal;
import br.com.someli.dto.ClientePagamentoDTO;
import br.com.someli.dto.ResumoFinanceiroDTO;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.DespesaMensalRepository;
import br.com.someli.repository.DespesaRepository;
import br.com.someli.repository.PagamentoMensalRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FinanceiroServiceBoletoTest {

    @Mock private ClienteRepository clienteRepository;
    @Mock private PagamentoMensalRepository pagamentoMensalRepository;
    @Mock private DespesaRepository despesaRepository;
    @Mock private DespesaMensalRepository despesaMensalRepository;
    @Mock private ClienteService clienteService;

    private Cliente cliente(long id, String nome) {
        Cliente c = new Cliente();
        c.setId(id);
        c.setNomeFantasia(nome);
        c.setAtivo(true);
        c.setHonorario(new BigDecimal("300.00"));
        c.setDiaVencimento(10);
        c.setDataInicioCobranca(LocalDate.of(2026, 1, 1));
        return c;
    }

    @Test
    void resumo_informaBoletoEnviadoQuemEQuando() {
        LocalDateTime quando = LocalDateTime.of(2026, 11, 3, 9, 30);
        PagamentoMensal pm = new PagamentoMensal();
        pm.setClienteId(1L);
        pm.setMes(11);
        pm.setAno(2026);
        pm.setPago(false);
        pm.setBoletoEnviado(true);
        pm.setBoletoEnviadoEm(quando);
        pm.setBoletoEnviadoPor("Karol");
        when(clienteRepository.findAll()).thenReturn(List.of(cliente(1L, "Fra Carnes"), cliente(2L, "Leudo")));
        when(pagamentoMensalRepository.findByMesAndAno(11, 2026)).thenReturn(List.of(pm));

        ResumoFinanceiroDTO r = new FinanceiroService(clienteRepository, pagamentoMensalRepository, despesaRepository,
                despesaMensalRepository, clienteService).obterResumo(11, 2026);

        ClientePagamentoDTO fra = r.getClientes().stream().filter(c -> c.getId() == 1L).findFirst().orElseThrow();
        ClientePagamentoDTO leudo = r.getClientes().stream().filter(c -> c.getId() == 2L).findFirst().orElseThrow();
        assertThat(fra.isBoletoEnviado()).isTrue();
        assertThat(fra.getBoletoEnviadoPor()).isEqualTo("Karol");
        assertThat(fra.getBoletoEnviadoEm()).isEqualTo(quando);
        assertThat(fra.isPago()).isFalse();
        assertThat(leudo.isBoletoEnviado()).isFalse();
    }
}
