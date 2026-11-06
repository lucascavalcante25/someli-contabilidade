package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteAnotacao;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.ClienteAnotacaoSalvarRequest;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.repository.ClienteAnotacaoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClienteAnotacaoServiceTest {

    @Mock private ClienteAnotacaoRepository anotacaoRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private AuditLogService auditLogService;
    @Mock private ClienteResponsavelRepository responsaveis;

    private ClienteAnotacaoService service;
    private Usuario usuario;
    private Cliente cliente;

    @BeforeEach
    void setUp() {
        service = new ClienteAnotacaoService(
                anotacaoRepository, clienteRepository, authorizationService, auditLogService,
                new FichaSetorGuard(authorizationService, responsaveis));
        usuario = new Usuario();
        usuario.setId(3L);
        usuario.setNome("Ana");
        cliente = new Cliente();
        cliente.setId(7L);
    }

    @Test
    void semPermissao_naoLista() {
        doThrow(new AcessoNegadoException("Sem permissão: CLIENTES_VISUALIZAR"))
                .when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        assertThatThrownBy(() -> service.listar(7L)).isInstanceOf(AcessoNegadoException.class);
        verify(anotacaoRepository, never()).findAtivosByClienteId(any());
    }

    @Test
    void semAlcada_naoCria() {
        doThrow(new AcessoNegadoException("Sem alçada sobre este cliente"))
                .when(authorizationService).requireCompanyAccess(7L);
        assertThatThrownBy(() -> service.criar(7L, pedido("Título", "texto", null, false)))
                .isInstanceOf(AcessoNegadoException.class);
        verify(anotacaoRepository, never()).save(any());
    }

    @Test
    void anotacaoDeOutroCliente_nega() {
        Cliente outro = new Cliente();
        outro.setId(8L);
        ClienteAnotacao anotacao = nota("Aviso", "texto interno", "FISCAL");
        anotacao.setCliente(outro);
        when(anotacaoRepository.findDetalheById(4L)).thenReturn(Optional.of(anotacao));
        doThrow(new AcessoNegadoException("Sem alçada sobre este cliente"))
                .when(authorizationService).requireCompanyAccess(8L);

        assertThatThrownBy(() -> service.atualizar(4L, pedido("Aviso", "texto interno", "FISCAL", false)))
                .isInstanceOf(AcessoNegadoException.class);
        verify(auditLogService, never()).registrar(anyString(), anyString(), anyString(), any(), any());
    }

    @Test
    void semAlcadaGlobal_filtraPorSetor() {
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.hasAlcadaGlobal(any())).thenReturn(false);
        when(responsaveis.findSetoresAtivos(7L, 3L)).thenReturn(List.of("FISCAL"));
        ClienteAnotacao fiscal = nota("Guia", "pagar até sexta", "FISCAL");
        ClienteAnotacao pessoal = nota("Folha", "outro setor", "DEPARTAMENTO_PESSOAL");
        pessoal.setId(5L);
        ClienteAnotacao geral = nota("Link", "https://exemplo.test", null);
        geral.setId(6L);
        when(anotacaoRepository.findAtivosByClienteId(7L)).thenReturn(List.of(fiscal, pessoal, geral));

        assertThat(service.listar(7L)).extracting(a -> a.titulo()).containsExactly("Guia", "Link");
    }

    @Test
    void criar_auditaTituloSemOTexto() {
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.hasAlcadaGlobal(any())).thenReturn(true);
        when(clienteRepository.findById(7L)).thenReturn(Optional.of(cliente));
        when(anotacaoRepository.save(any())).thenAnswer(inv -> {
            ClienteAnotacao salva = inv.getArgument(0);
            salva.setId(4L);
            return salva;
        });

        service.criar(7L, pedido("Protocolo", "XYZ-NAO-AUDITAR", "FISCAL", true));

        verify(auditLogService).registrar(eq("ANOTACAO_CRIAR"), eq("CLIENTE"), eq("7"), isNull(), eq("Protocolo"));
    }

    @Test
    void fixar_auditaSemRegravarTexto() {
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.hasAlcadaGlobal(any())).thenReturn(true);
        ClienteAnotacao anotacao = nota("Protocolo", "XYZ-NAO-AUDITAR", "FISCAL");
        when(anotacaoRepository.findDetalheById(4L)).thenReturn(Optional.of(anotacao));

        service.atualizar(4L, pedido("Protocolo", "XYZ-NAO-AUDITAR", "FISCAL", true));

        verify(auditLogService).registrar(eq("ANOTACAO_FIXAR"), eq("CLIENTE"), eq("7"), isNull(), eq("Protocolo"));
    }

    @Test
    void trelloIgual_naoDuplica() {
        when(authorizationService.hasAlcadaGlobal(any())).thenReturn(true);
        when(clienteRepository.findById(7L)).thenReturn(Optional.of(cliente));
        ClienteAnotacao existente = nota("Protocolo", "mesmo texto", null);
        existente.setOrigem("TRELLO");
        when(anotacaoRepository.findTrelloAtivas(7L)).thenReturn(List.of(existente));

        var gravacao = service.criar(7L, new ClienteAnotacaoSalvarRequest("Protocolo", "mesmo texto", null, false, "TRELLO"));

        assertThat(gravacao.criado()).isFalse();
        verify(anotacaoRepository, never()).save(any());
    }

    private ClienteAnotacaoSalvarRequest pedido(String titulo, String texto, String setor, boolean fixada) {
        return new ClienteAnotacaoSalvarRequest(titulo, texto, setor, fixada, "MANUAL");
    }

    private ClienteAnotacao nota(String titulo, String texto, String setor) {
        ClienteAnotacao anotacao = new ClienteAnotacao();
        anotacao.setId(4L);
        anotacao.setCliente(cliente);
        anotacao.setTitulo(titulo);
        anotacao.setTexto(texto);
        anotacao.setSetor(setor);
        anotacao.setOrigem("MANUAL");
        anotacao.setAtivo(true);
        anotacao.setAtualizadoPor(usuario);
        return anotacao;
    }
}
