package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.PagamentoMensalRepository;
import br.com.someli.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class ClienteServiceMesesSeguidosTest {

    @Mock private ClienteRepository clienteRepository;
    @Mock private PagamentoMensalRepository pagamentoMensalRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private AuditLogService auditLogService;
    @Mock private TagSyncService tagSyncService;

    private Cliente clienteComSetembroEOutubroEmAberto() {
        Cliente c = new Cliente();
        c.setId(1L);
        c.setAtivo(true);
        c.setDiaVencimento(10);
        c.setDataInicioCobranca(LocalDate.of(2026, 1, 1));
        return c;
    }

    private Set<YearMonth> pagosAteAgosto() {
        return Set.of(YearMonth.of(2026, 1), YearMonth.of(2026, 2), YearMonth.of(2026, 3), YearMonth.of(2026, 4),
                YearMonth.of(2026, 5), YearMonth.of(2026, 6), YearMonth.of(2026, 7), YearMonth.of(2026, 8));
    }

    private ClienteService service() {
        return new ClienteService(clienteRepository, pagamentoMensalRepository, usuarioRepository,
                authorizationService, auditLogService, tagSyncService);
    }

    @Test
    void mesAtualAntesDoVencimento_naoEntraNaSequencia() {
        Cliente c = clienteComSetembroEOutubroEmAberto();

        service().enriquecerStatusPagamento(c, YearMonth.of(2026, 11), LocalDate.of(2026, 11, 2),
                pagosAteAgosto(), Set.of());

        assertThat(c.getMesesPendentesSeguidos()).isEqualTo(2);
    }

    @Test
    void mesAtualVencido_entraNaSequencia() {
        Cliente c = clienteComSetembroEOutubroEmAberto();

        service().enriquecerStatusPagamento(c, YearMonth.of(2026, 11), LocalDate.of(2026, 11, 11),
                pagosAteAgosto(), Set.of());

        assertThat(c.getMesesPendentesSeguidos()).isEqualTo(3);
    }
}
