package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteDocumento;
import br.com.someli.domain.ClienteResponsavel;
import br.com.someli.domain.Perfil;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.SolicitacaoDocumento;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.CreateSolicitacaoDocumentoDTO;
import br.com.someli.dto.SolicitacaoDocumentoDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.exception.SolicitacaoDocumentoNaoEncontradaException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.SolicitacaoDocumentoRepository;
import br.com.someli.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SolicitacaoDocumentoServiceTest {

    @Mock private SolicitacaoDocumentoRepository repository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private ClienteDocumentoService documentoService;
    @Mock private AuthorizationService authorizationService;
    @Mock private ClienteResponsavelRepository responsavelRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private NotificationService notificationService;

    private SolicitacaoDocumentoService service;
    private Cliente cliente;

    @BeforeEach
    void setUp() {
        service = new SolicitacaoDocumentoService(repository, clienteRepository, documentoService, authorizationService,
                responsavelRepository, usuarioRepository, notificationService);
        cliente = new Cliente();
        cliente.setId(7L);
        cliente.setRazaoSocial("Empresa Teste");
    }

    private CreateSolicitacaoDocumentoDTO pedido() {
        CreateSolicitacaoDocumentoDTO dto = new CreateSolicitacaoDocumentoDTO();
        dto.setTitulo("Extrato de outubro");
        dto.setCompetencia("2026-10");
        dto.setDiasValidade(7);
        return dto;
    }

    private SolicitacaoDocumento aberta() {
        SolicitacaoDocumento s = new SolicitacaoDocumento();
        s.setId(1L);
        s.setCliente(cliente);
        s.setTitulo("Extrato de outubro");
        s.setCompetencia("2026-10");
        s.setStatus(SolicitacaoDocumento.PENDENTE);
        s.setExpiraEm(LocalDateTime.now().plusDays(3));
        s.setArquivosRecebidos(0);
        return s;
    }

    @Test
    void criar_semPermissao_nega() {
        doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_EDITAR);

        assertThatThrownBy(() -> service.criar(7L, pedido())).isInstanceOf(AcessoNegadoException.class);

        verify(repository, never()).save(any());
    }

    @Test
    void criar_semAlcadaNoCliente_nega() {
        doThrow(new AcessoNegadoException("Sem alçada"))
                .when(authorizationService).requireCompanyAccess(7L);

        assertThatThrownBy(() -> service.criar(7L, pedido())).isInstanceOf(AcessoNegadoException.class);

        verify(repository, never()).save(any());
    }

    @Test
    void criar_guardaSoOHashDoTokenEDevolveTokenUmaVez() {
        when(clienteRepository.findById(7L)).thenReturn(Optional.of(cliente));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SolicitacaoDocumentoDTO dto = service.criar(7L, pedido());

        ArgumentCaptor<SolicitacaoDocumento> salvo = ArgumentCaptor.forClass(SolicitacaoDocumento.class);
        verify(repository).save(salvo.capture());
        assertThat(dto.token()).hasSizeGreaterThanOrEqualTo(43);
        assertThat(salvo.getValue().getTokenHash()).hasSize(64).isNotEqualTo(dto.token());
        assertThat(salvo.getValue().getTokenHash()).isEqualTo(SolicitacaoDocumentoService.hash(dto.token()));
        assertThat(salvo.getValue().getExpiraEm()).isAfter(LocalDateTime.now().plusDays(6));
    }

    @Test
    void criar_validadeLimitadaA30Dias() {
        when(clienteRepository.findById(7L)).thenReturn(Optional.of(cliente));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        CreateSolicitacaoDocumentoDTO dto = pedido();
        dto.setDiasValidade(365);

        service.criar(7L, dto);

        ArgumentCaptor<SolicitacaoDocumento> salvo = ArgumentCaptor.forClass(SolicitacaoDocumento.class);
        verify(repository).save(salvo.capture());
        assertThat(salvo.getValue().getExpiraEm()).isBefore(LocalDateTime.now().plusDays(31));
    }

    @Test
    void publico_tokenDesconhecido_naoRevelaNada() {
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.buscarPublico("invalido"))
                .isInstanceOf(SolicitacaoDocumentoNaoEncontradaException.class);
    }

    @Test
    void publico_linkExpirado_negaUpload() throws Exception {
        SolicitacaoDocumento s = aberta();
        s.setExpiraEm(LocalDateTime.now().minusMinutes(1));
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(s));
        MockMultipartFile file = new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[]{1});

        assertThatThrownBy(() -> service.receberArquivo("token", file))
                .isInstanceOf(SolicitacaoDocumentoNaoEncontradaException.class);

        verify(documentoService, never()).salvarRecebidoPorLink(any(), any(), any(), any());
    }

    @Test
    void publico_linkCancelado_negaUpload() {
        SolicitacaoDocumento s = aberta();
        s.setStatus(SolicitacaoDocumento.CANCELADO);
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(s));
        MockMultipartFile file = new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[]{1});

        assertThatThrownBy(() -> service.receberArquivo("token", file))
                .isInstanceOf(SolicitacaoDocumentoNaoEncontradaException.class);
    }

    @Test
    void publico_tipoNaoPermitido_recusa() throws Exception {
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(aberta()));
        MockMultipartFile file = new MockMultipartFile("file", "virus.exe", "application/pdf", new byte[]{1});

        assertThatThrownBy(() -> service.receberArquivo("token", file))
                .isInstanceOf(RegraNegocioException.class);

        verify(documentoService, never()).salvarRecebidoPorLink(any(), any(), any(), any());
    }

    @Test
    void publico_arquivoGrandeDemais_recusa() {
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(aberta()));
        byte[] grande = new byte[(int) SolicitacaoDocumentoService.TAMANHO_MAXIMO + 1];
        MockMultipartFile file = new MockMultipartFile("file", "a.pdf", "application/pdf", grande);

        assertThatThrownBy(() -> service.receberArquivo("token", file))
                .isInstanceOf(RegraNegocioException.class);
    }

    @Test
    void publico_limiteDeArquivos_recusa() {
        SolicitacaoDocumento s = aberta();
        s.setArquivosRecebidos(SolicitacaoDocumentoService.MAX_ARQUIVOS);
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(s));
        MockMultipartFile file = new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[]{1});

        assertThatThrownBy(() -> service.receberArquivo("token", file))
                .isInstanceOf(RegraNegocioException.class);
    }

    @Test
    void publico_arquivoValido_salvaEMarcaRecebido() throws Exception {
        SolicitacaoDocumento s = aberta();
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(s));
        when(documentoService.salvarRecebidoPorLink(eq(cliente), any(), eq("Extrato de outubro"), eq("2026-10")))
                .thenReturn(new ClienteDocumento());
        MockMultipartFile file = new MockMultipartFile("file", "extrato.PDF", "application/pdf", new byte[]{1});

        service.receberArquivo("token", file);

        assertThat(s.getStatus()).isEqualTo(SolicitacaoDocumento.RECEBIDO);
        assertThat(s.getArquivosRecebidos()).isEqualTo(1);
        assertThat(s.getRecebidoEm()).isNotNull();
    }

    private Usuario usuario(long id, Perfil perfil, boolean ativo) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setPerfil(perfil);
        u.setAtivo(ativo);
        return u;
    }

    private ClienteResponsavel responsavel(Usuario u) {
        ClienteResponsavel r = new ClienteResponsavel();
        r.setUsuario(u);
        return r;
    }

    private void receberPdf() throws Exception {
        SolicitacaoDocumento s = aberta();
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(s));
        service.receberArquivo("token", new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[]{1}));
    }

    private void verificarAlerta(Usuario destinatario) {
        verify(notificationService).criarSeNaoExiste(eq(destinatario), isNull(),
                eq("Documento recebido: Empresa Teste"), eq("Extrato de outubro"), eq("alta"),
                eq("DOCUMENTO_RECEBIDO"), startsWith("DOC_LINK:1:"), eq("/clientes/7"));
    }

    @Test
    void variosArquivosDoMesmoLote_usamAMesmaChaveParaGerarUmAlertaSo() throws Exception {
        Usuario fiscal = usuario(10, Perfil.FISCAL, true);
        when(responsavelRepository.findAtivosByClienteId(7L)).thenReturn(List.of(responsavel(fiscal)));
        SolicitacaoDocumento s = aberta();
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(s));
        MockMultipartFile file = new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[]{1});

        service.receberArquivo("token", file);
        service.receberArquivo("token", file);

        ArgumentCaptor<String> chave = ArgumentCaptor.forClass(String.class);
        verify(notificationService, times(2)).criarSeNaoExiste(eq(fiscal), isNull(), anyString(), anyString(),
                anyString(), anyString(), chave.capture(), anyString());
        assertThat(chave.getAllValues().get(0)).isEqualTo(chave.getAllValues().get(1));
    }

    @Test
    void recebido_alertaCadaResponsavelAtivoUmaVez() throws Exception {
        Usuario fiscal = usuario(10, Perfil.FISCAL, true);
        Usuario inativo = usuario(11, Perfil.FISCAL, false);
        when(responsavelRepository.findAtivosByClienteId(7L))
                .thenReturn(List.of(responsavel(fiscal), responsavel(fiscal), responsavel(inativo)));

        receberPdf();

        verificarAlerta(fiscal);
        verify(notificationService, never()).criarSeNaoExiste(eq(inativo), any(), any(), any(), any(), any(), any(), any());
        verify(usuarioRepository, never()).findAll();
    }

    @Test
    void recebido_semResponsavel_alertaAdminsESociosAtivos() throws Exception {
        Usuario admin = usuario(1, Perfil.ADMIN, true);
        Usuario socio = usuario(2, Perfil.SOCIO, true);
        Usuario operador = usuario(3, Perfil.OPERADOR, true);
        Usuario adminInativo = usuario(4, Perfil.ADMIN, false);
        when(responsavelRepository.findAtivosByClienteId(7L)).thenReturn(List.of());
        when(usuarioRepository.findAll()).thenReturn(List.of(admin, socio, operador, adminInativo));

        receberPdf();

        verificarAlerta(admin);
        verificarAlerta(socio);
        verify(notificationService, never()).criarSeNaoExiste(eq(operador), any(), any(), any(), any(), any(), any(), any());
        verify(notificationService, never()).criarSeNaoExiste(eq(adminInativo), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void falhaAoSalvarArquivo_naoGeraAlerta() throws Exception {
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(aberta()));
        when(documentoService.salvarRecebidoPorLink(any(), any(), any(), any())).thenThrow(new IOException("disco"));
        MockMultipartFile file = new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[]{1});

        assertThatThrownBy(() -> service.receberArquivo("token", file)).isInstanceOf(IOException.class);

        verifyNoInteractions(notificationService);
    }

    @Test
    void cancelar_semAlcada_nega() {
        when(repository.findById(1L)).thenReturn(Optional.of(aberta()));
        doThrow(new AcessoNegadoException("Sem alçada"))
                .when(authorizationService).requireCompanyAccess(7L);

        assertThatThrownBy(() -> service.cancelar(7L, 1L)).isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void cancelar_deOutroCliente_naoEncontra() {
        when(repository.findById(1L)).thenReturn(Optional.of(aberta()));

        assertThatThrownBy(() -> service.cancelar(99L, 1L))
                .isInstanceOf(SolicitacaoDocumentoNaoEncontradaException.class);
    }
}
