package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteAcesso;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.ClienteAcessoAtualizarRequest;
import br.com.someli.dto.ClienteAcessoCriarRequest;
import br.com.someli.dto.ClienteAcessoResumoDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.LimiteRequisicoesException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteAcessoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.security.CofreCrypto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
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
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClienteAcessoServiceTest {

    private static final String SENHA = "SEGREDO-UNICO-99";

    @Mock private ClienteAcessoRepository acessoRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private AuditLogService auditLogService;
    @Mock private ClienteResponsavelRepository responsaveis;

    private final CofreCrypto crypto = new CofreCrypto(
            Base64.getEncoder().encodeToString(new byte[32]).replace('A', 'C'));
    private ClienteAcessoService service;
    private Usuario usuario;
    private Cliente cliente;

    @BeforeEach
    void setUp() {
        service = new ClienteAcessoService(
                acessoRepository, clienteRepository, authorizationService, auditLogService, crypto,
                new FichaSetorGuard(authorizationService, responsaveis),
                new RevelarRateLimiter(Clock.fixed(Instant.parse("2026-11-06T15:00:00Z"), ZoneOffset.UTC)));
        usuario = new Usuario();
        usuario.setId(3L);
        usuario.setNome("Ana");
        cliente = new Cliente();
        cliente.setId(7L);
    }

    @Test
    void listar_mascaraLogin_eNaoDevolveSenha() {
        when(authorizationService.hasAlcadaGlobal(any())).thenReturn(true);
        ClienteAcesso acesso = acesso("e-CAC", "joao", SENHA, "FISCAL");
        when(acessoRepository.findAtivosByClienteId(7L)).thenReturn(List.of(acesso));

        ClienteAcessoResumoDTO dto = service.listar(7L).get(0);

        assertThat(dto.loginMascarado()).isEqualTo("joa•••");
        assertThat(dto.sistema()).isEqualTo("e-CAC");
        assertThat(dto.toString()).doesNotContain(SENHA).doesNotContain("joao");
        verify(authorizationService).requirePermission(PermissaoCodigo.CLIENTE_ACESSOS_VER);
        verify(authorizationService).requireCompanyAccess(7L);
    }

    @Test
    void revelar_devolveEmClaro_eAuditaSoOSistema() {
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.hasAlcadaGlobal(usuario)).thenReturn(true);
        ClienteAcesso acesso = acesso("e-CAC", "joao", SENHA, null);
        acesso.setObservacao(crypto.cifrarTexto("código 1", "cliente:7:acesso:observacao"));
        when(acessoRepository.findDetalheById(9L)).thenReturn(Optional.of(acesso));

        var dto = service.revelar(9L);

        assertThat(dto.login()).isEqualTo("joao");
        assertThat(dto.senha()).isEqualTo(SENHA);
        assertThat(dto.observacao()).isEqualTo("código 1");
        ArgumentCaptor<String> valores = ArgumentCaptor.forClass(String.class);
        verify(auditLogService).registrar(eq("ACESSO_REVELADO"), eq("CLIENTE"), eq("7"), isNull(), valores.capture());
        assertThat(valores.getAllValues()).doesNotContain(SENHA, "joao", "código 1");
        assertThat(valores.getValue()).isEqualTo("e-CAC");
    }

    @Test
    void semPermissao_naoLista() {
        doThrow(new AcessoNegadoException("Sem permissão: CLIENTE_ACESSOS_VER"))
                .when(authorizationService).requirePermission(PermissaoCodigo.CLIENTE_ACESSOS_VER);

        assertThatThrownBy(() -> service.listar(7L)).isInstanceOf(AcessoNegadoException.class);
        verify(acessoRepository, never()).findAtivosByClienteId(any());
    }

    @Test
    void semAlcada_naoRevela() {
        ClienteAcesso acesso = acesso("e-CAC", "joao", SENHA, null);
        when(acessoRepository.findDetalheById(9L)).thenReturn(Optional.of(acesso));
        doThrow(new AcessoNegadoException("Sem alçada sobre este cliente"))
                .when(authorizationService).requireCompanyAccess(7L);

        assertThatThrownBy(() -> service.revelar(9L)).isInstanceOf(AcessoNegadoException.class);
        verify(auditLogService, never()).registrar(anyString(), anyString(), anyString(), any(), any());
    }

    @Test
    void acessoDeOutroCliente_negaPelaAlcadaDoDono() {
        Cliente outro = new Cliente();
        outro.setId(8L);
        ClienteAcesso acesso = acesso("SEFAZ", "joao", SENHA, "FISCAL");
        acesso.setCliente(outro);
        when(acessoRepository.findDetalheById(9L)).thenReturn(Optional.of(acesso));
        doThrow(new AcessoNegadoException("Sem alçada sobre este cliente"))
                .when(authorizationService).requireCompanyAccess(8L);

        assertThatThrownBy(() -> service.revelar(9L)).isInstanceOf(AcessoNegadoException.class);
        verify(auditLogService, never()).registrar(anyString(), anyString(), anyString(), any(), any());
    }

    @Test
    void semAlcadaGlobal_veSoOProprioSetorEOsSemSetor() {
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.hasAlcadaGlobal(any())).thenReturn(false);
        when(responsaveis.findSetoresAtivos(7L, 3L)).thenReturn(List.of("FISCAL"));
        ClienteAcesso fiscal = acesso("e-CAC", "joao", SENHA, "FISCAL");
        ClienteAcesso pessoal = acesso("eSocial", "maria", "outra", "DEPARTAMENTO_PESSOAL");
        pessoal.setId(10L);
        ClienteAcesso geral = acesso("Prefeitura", "ana", "xxx", null);
        geral.setId(11L);
        when(acessoRepository.findAtivosByClienteId(7L)).thenReturn(List.of(fiscal, pessoal, geral));

        assertThat(service.listar(7L)).extracting(ClienteAcessoResumoDTO::sistema)
                .containsExactly("e-CAC", "Prefeitura");
    }

    @Test
    void gerenteDeConta_veTodosOsSetores() {
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.hasAlcadaGlobal(any())).thenReturn(false);
        when(responsaveis.findSetoresAtivos(7L, 3L)).thenReturn(List.of("GERENTE_CONTA"));
        ClienteAcesso pessoal = acesso("eSocial", "maria", "outra", "DEPARTAMENTO_PESSOAL");
        when(acessoRepository.findAtivosByClienteId(7L)).thenReturn(List.of(pessoal));

        assertThat(service.listar(7L)).hasSize(1);
    }

    @Test
    void cofreDesligado_recusaComMensagemClara() {
        ClienteAcessoService desligado = new ClienteAcessoService(
                acessoRepository, clienteRepository, authorizationService, auditLogService, new CofreCrypto(""),
                new FichaSetorGuard(authorizationService, responsaveis),
                new RevelarRateLimiter(Clock.systemUTC()));

        assertThatThrownBy(() -> desligado.listar(7L))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("COFRE_CHAVE_MESTRA");
    }

    @Test
    void criar_cifraENaoAuditaOValor() {
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.hasAlcadaGlobal(any())).thenReturn(true);
        when(clienteRepository.findById(7L)).thenReturn(Optional.of(cliente));
        when(acessoRepository.save(any())).thenAnswer(inv -> {
            ClienteAcesso salvo = inv.getArgument(0);
            salvo.setId(9L);
            return salvo;
        });

        var gravacao = service.criar(7L, new ClienteAcessoCriarRequest(
                "e-CAC", "https://cav.receita.fazenda.gov.br", "joao", SENHA, "obs", "FISCAL", "MANUAL"));

        assertThat(gravacao.criado()).isTrue();
        assertThat(gravacao.corpo().loginMascarado()).isEqualTo("joa•••");
        assertThat(gravacao.corpo().toString()).doesNotContain(SENHA);
        ArgumentCaptor<ClienteAcesso> captor = ArgumentCaptor.forClass(ClienteAcesso.class);
        verify(acessoRepository).save(captor.capture());
        assertThat(captor.getValue().getSenha()).isNotEqualTo(SENHA.getBytes());
        assertThat(new String(captor.getValue().getSenha())).doesNotContain(SENHA);
        verify(auditLogService).registrar(eq("ACESSO_CRIAR"), eq("CLIENTE"), eq("7"), isNull(), eq("e-CAC"));
    }

    @Test
    void trelloRepetido_naoGravaDeNovo() {
        when(authorizationService.hasAlcadaGlobal(any())).thenReturn(true);
        when(clienteRepository.findById(7L)).thenReturn(Optional.of(cliente));
        ClienteAcesso existente = acesso("e-CAC", "joao", SENHA, null);
        existente.setOrigem("TRELLO");
        when(acessoRepository.findTrelloPorSistema(7L, "e-CAC")).thenReturn(List.of(existente));

        var gravacao = service.criar(7L, new ClienteAcessoCriarRequest(
                "e-CAC", null, "outro", "nova", null, null, "TRELLO"));

        assertThat(gravacao.criado()).isFalse();
        verify(acessoRepository, never()).save(any());
        verify(auditLogService, never()).registrar(anyString(), anyString(), anyString(), any(), any());
    }

    @Test
    void atualizar_senhaEmBrancoMantemAAnterior() {
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.hasAlcadaGlobal(any())).thenReturn(true);
        ClienteAcesso acesso = acesso("e-CAC", "joao", SENHA, "FISCAL");
        byte[] senhaGuardada = acesso.getSenha().clone();
        when(acessoRepository.findDetalheById(9L)).thenReturn(Optional.of(acesso));
        when(acessoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.atualizar(9L, new ClienteAcessoAtualizarRequest("e-CAC", null, "joao", "  ", null, "FISCAL"));

        assertThat(acesso.getSenha()).isEqualTo(senhaGuardada);
        verify(auditLogService).registrar(eq("ACESSO_ALTERAR"), eq("CLIENTE"), eq("7"), isNull(), eq("e-CAC"));
    }

    @Test
    void revelarDemais_estouraOLimiteSemAuditarARecusa() {
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.hasAlcadaGlobal(usuario)).thenReturn(true);
        ClienteAcesso acesso = acesso("e-CAC", "joao", SENHA, null);
        when(acessoRepository.findDetalheById(9L)).thenReturn(Optional.of(acesso));

        for (int i = 0; i < RevelarRateLimiter.LIMITE; i++) {
            service.revelar(9L);
        }
        assertThatThrownBy(() -> service.revelar(9L)).isInstanceOf(LimiteRequisicoesException.class);
        verify(auditLogService, times(RevelarRateLimiter.LIMITE))
                .registrar(eq("ACESSO_REVELADO"), eq("CLIENTE"), eq("7"), isNull(), eq("e-CAC"));
    }

    @Test
    void urlInvalida_rejeitaSemEcoarOValor() {
        assertThat(ClienteAcessoService.mascararLogin("joao")).isEqualTo("joa•••");
        assertThat(ClienteAcessoService.mascararLogin("ab")).isEqualTo("•••");
        assertThatThrownBy(() -> ClienteAcessoService.normalizarUrl("javascript:alert(1)"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("javascript");
        assertThatThrownBy(() -> ClienteAcessoService.normalizarUrl("https://user:secreta@exemplo.gov.br"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("secreta");
    }

    private ClienteAcesso acesso(String sistema, String login, String senha, String setor) {
        ClienteAcesso acesso = new ClienteAcesso();
        acesso.setId(9L);
        acesso.setCliente(cliente);
        acesso.setSistema(sistema);
        acesso.setSetor(setor);
        acesso.setOrigem("MANUAL");
        acesso.setAtivo(true);
        acesso.setAtualizadoPor(usuario);
        acesso.setLogin(crypto.cifrarTexto(login, "cliente:7:acesso:login"));
        acesso.setSenha(crypto.cifrarTexto(senha, "cliente:7:acesso:senha"));
        return acesso;
    }
}
