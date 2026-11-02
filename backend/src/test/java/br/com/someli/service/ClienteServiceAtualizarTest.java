package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.dto.UpdateClienteRequestDTO;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.PagamentoMensalRepository;
import br.com.someli.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClienteServiceAtualizarTest {

    @Mock private ClienteRepository clienteRepository;
    @Mock private PagamentoMensalRepository pagamentoMensalRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private AuditLogService auditLogService;
    @Mock private TagSyncService tagSyncService;

    private ClienteService service;
    private Cliente existente;

    @BeforeEach
    void setUp() {
        service = new ClienteService(clienteRepository, pagamentoMensalRepository, usuarioRepository,
                authorizationService, auditLogService, tagSyncService);
        existente = new Cliente();
        existente.setId(1L);
        existente.setRazaoSocial("Padaria Bom Pão");
        existente.setHonorario(new BigDecimal("380.00"));
        lenient().when(clienteRepository.findByIdWithResponsavel(1L)).thenReturn(Optional.of(existente));
        lenient().when(pagamentoMensalRepository.findByClienteId(1L)).thenReturn(List.of());
    }

    private UpdateClienteRequestDTO pedido(String conta) {
        UpdateClienteRequestDTO r = new UpdateClienteRequestDTO();
        r.setRazaoSocial("Padaria Bom Pão");
        r.setHonorario(new BigDecimal("380.00"));
        r.setDiaVencimento(10);
        r.setTipoPagamento("pessoa_juridica");
        r.setStatus("em_dia");
        r.setContaRecebimento(conta);
        return r;
    }

    @Test
    void atualizar_gravaContaNormalizada() {
        when(clienteRepository.save(any(Cliente.class))).thenAnswer(inv -> inv.getArgument(0));

        service.atualizar(1L, pedido("p"));

        assertThat(existente.getContaRecebimento()).isEqualTo("PATRICIA");
    }

    @Test
    void atualizar_contaInvalida_naoGrava() {
        assertThatThrownBy(() -> service.atualizar(1L, pedido("K"))).isInstanceOf(RegraNegocioException.class);

        verify(clienteRepository, never()).save(any());
    }

    @Test
    void atualizar_devolveClienteRecarregadoComResponsavel() {
        Cliente salvoSemResponsavelCarregado = new Cliente();
        salvoSemResponsavelCarregado.setId(1L);
        when(clienteRepository.save(any(Cliente.class))).thenReturn(salvoSemResponsavelCarregado);

        Cliente resposta = service.atualizar(1L, pedido("S"));

        assertThat(resposta).isSameAs(existente);
    }
}
