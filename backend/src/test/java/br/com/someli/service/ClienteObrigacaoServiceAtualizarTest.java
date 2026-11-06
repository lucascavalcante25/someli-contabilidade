package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.Obrigacao;
import br.com.someli.dto.UpdateClienteObrigacaoRequestDTO;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ObrigacaoRepository;
import br.com.someli.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClienteObrigacaoServiceAtualizarTest {

    @Mock ClienteObrigacaoRepository clienteObrigacaoRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock ObrigacaoRepository obrigacaoRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock AuthorizationService authorizationService;
    @Mock ObrigacaoOcorrenciaService ocorrenciaService;
    @Mock DiaUtilService diaUtilService;

    @Test
    void atualizar_devolveVinculoRecarregadoComObrigacao() {
        ClienteObrigacaoService service = new ClienteObrigacaoService(clienteObrigacaoRepository, clienteRepository,
                obrigacaoRepository, usuarioRepository, authorizationService, ocorrenciaService, diaUtilService);
        when(diaUtilService.ajustarVencimento(any(), any())).thenAnswer(inv -> inv.getArgument(0));
        Cliente cliente = new Cliente();
        cliente.setId(1L);
        Obrigacao obrigacao = new Obrigacao();
        obrigacao.setId(11L);
        ClienteObrigacao carregado = new ClienteObrigacao();
        carregado.setId(5L);
        carregado.setCliente(cliente);
        carregado.setObrigacao(obrigacao);
        when(clienteObrigacaoRepository.findByIdWithObrigacao(5L)).thenReturn(Optional.of(carregado));
        when(clienteObrigacaoRepository.save(any(ClienteObrigacao.class))).thenReturn(new ClienteObrigacao());

        UpdateClienteObrigacaoRequestDTO request = new UpdateClienteObrigacaoRequestDTO();
        request.setDataVencimento(LocalDate.of(2026, 11, 20));

        ClienteObrigacao resposta = service.atualizar(5L, request);

        assertThat(resposta).isSameAs(carregado);
        assertThat(resposta.getDataVencimento()).isEqualTo(LocalDate.of(2026, 11, 20));
    }
}
