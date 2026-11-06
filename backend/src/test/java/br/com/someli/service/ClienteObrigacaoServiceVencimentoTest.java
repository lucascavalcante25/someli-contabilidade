package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.Obrigacao;
import br.com.someli.dto.CreateClienteObrigacaoRequestDTO;
import br.com.someli.dto.UpdateClienteObrigacaoRequestDTO;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ObrigacaoRepository;
import br.com.someli.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClienteObrigacaoServiceVencimentoTest {

    @Mock ClienteObrigacaoRepository clienteObrigacaoRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock ObrigacaoRepository obrigacaoRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock AuthorizationService authorizationService;
    @Mock ObrigacaoOcorrenciaService ocorrenciaService;
    @Mock DiaUtilService diaUtilService;

    ClienteObrigacaoService service;
    static final LocalDate DIA_20 = LocalDate.of(2026, 11, 20);

    @BeforeEach
    void setUp() {
        service = new ClienteObrigacaoService(clienteObrigacaoRepository, clienteRepository, obrigacaoRepository,
                usuarioRepository, authorizationService, ocorrenciaService, diaUtilService);
        lenient().when(clienteObrigacaoRepository.save(any(ClienteObrigacao.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void criar_obrigacaoDoPessoalEmFeriado_antecipa() {
        Cliente cliente = new Cliente();
        cliente.setId(1L);
        Obrigacao esocial = new Obrigacao();
        esocial.setId(7L);
        esocial.setSetor("DEPARTAMENTO_PESSOAL");
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(cliente));
        when(obrigacaoRepository.findById(7L)).thenReturn(Optional.of(esocial));
        when(diaUtilService.ajustarVencimento(DIA_20, "DEPARTAMENTO_PESSOAL")).thenReturn(LocalDate.of(2026, 11, 19));
        CreateClienteObrigacaoRequestDTO req = new CreateClienteObrigacaoRequestDTO();
        req.setClienteId(1L);
        req.setObrigacaoId(7L);
        req.setDataVencimento(DIA_20);

        ClienteObrigacao co = service.criar(req);

        assertThat(co.getDataVencimento()).isEqualTo(LocalDate.of(2026, 11, 19));
        // O dia de referência continua 20: os meses seguintes também partem do dia 20
        assertThat(co.getDiaVencimento()).isEqualTo(20);
    }

    @Test
    void atualizar_obrigacaoFiscalEmFeriado_prorroga() {
        Cliente cliente = new Cliente();
        cliente.setId(1L);
        Obrigacao das = new Obrigacao();
        das.setId(3L);
        ClienteObrigacao co = new ClienteObrigacao();
        co.setId(9L);
        co.setCliente(cliente);
        co.setObrigacao(das);
        co.setSetor("FISCAL");
        when(clienteObrigacaoRepository.findByIdWithObrigacao(9L)).thenReturn(Optional.of(co));
        when(diaUtilService.ajustarVencimento(DIA_20, "FISCAL")).thenReturn(LocalDate.of(2026, 11, 23));
        UpdateClienteObrigacaoRequestDTO req = new UpdateClienteObrigacaoRequestDTO();
        req.setDataVencimento(DIA_20);

        assertThat(service.atualizar(9L, req).getDataVencimento()).isEqualTo(LocalDate.of(2026, 11, 23));
    }
}
