package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteResponsavel;
import br.com.someli.domain.Perfil;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.SolicitacaoDocumento;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.CreateSolicitacaoDocumentoDTO;
import br.com.someli.dto.SolicitacaoDocumentoDTO;
import br.com.someli.dto.SolicitacaoPublicaDTO;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.exception.SolicitacaoDocumentoNaoEncontradaException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.SolicitacaoDocumentoRepository;
import br.com.someli.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Collection;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SolicitacaoDocumentoService {

    static final long TAMANHO_MAXIMO = 15L * 1024 * 1024;
    static final int MAX_ARQUIVOS = 10;
    private static final int VALIDADE_PADRAO_DIAS = 7;
    private static final int VALIDADE_MAXIMA_DIAS = 30;
    private static final String LINK_INVALIDO = "Link inválido ou expirado";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SolicitacaoDocumentoRepository repository;
    private final ClienteRepository clienteRepository;
    private final ClienteDocumentoService documentoService;
    private final AuthorizationService authorizationService;
    private final ClienteResponsavelRepository responsavelRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotificationService notificationService;

    public SolicitacaoDocumentoService(SolicitacaoDocumentoRepository repository,
                                       ClienteRepository clienteRepository,
                                       ClienteDocumentoService documentoService,
                                       AuthorizationService authorizationService,
                                       ClienteResponsavelRepository responsavelRepository,
                                       UsuarioRepository usuarioRepository,
                                       NotificationService notificationService) {
        this.repository = repository;
        this.clienteRepository = clienteRepository;
        this.documentoService = documentoService;
        this.authorizationService = authorizationService;
        this.responsavelRepository = responsavelRepository;
        this.usuarioRepository = usuarioRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public SolicitacaoDocumentoDTO criar(Long clienteId, CreateSolicitacaoDocumentoDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        authorizationService.requireCompanyAccess(clienteId);
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado"));

        int dias = request.getDiasValidade() == null ? VALIDADE_PADRAO_DIAS
                : Math.min(Math.max(request.getDiasValidade(), 1), VALIDADE_MAXIMA_DIAS);
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        SolicitacaoDocumento solicitacao = new SolicitacaoDocumento();
        solicitacao.setCliente(cliente);
        solicitacao.setTitulo(request.getTitulo().trim());
        solicitacao.setDescricao(vazioParaNulo(request.getDescricao()));
        solicitacao.setCompetencia(vazioParaNulo(request.getCompetencia()));
        solicitacao.setTokenHash(hash(token));
        solicitacao.setExpiraEm(LocalDateTime.now().plusDays(dias));
        return toDto(repository.save(solicitacao), token);
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoDocumentoDTO> listar(Long clienteId) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        authorizationService.requireCompanyAccess(clienteId);
        return repository.findByClienteIdOrderByCriadoEmDesc(clienteId).stream()
                .map(s -> toDto(s, null))
                .toList();
    }

    @Transactional
    public void cancelar(Long clienteId, Long id) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        SolicitacaoDocumento solicitacao = repository.findById(id)
                .filter(s -> s.getCliente().getId().equals(clienteId))
                .orElseThrow(() -> new SolicitacaoDocumentoNaoEncontradaException("Pedido não encontrado"));
        authorizationService.requireCompanyAccess(clienteId);
        solicitacao.setStatus(SolicitacaoDocumento.CANCELADO);
    }

    @Transactional(readOnly = true)
    public SolicitacaoPublicaDTO buscarPublico(String token) {
        return toPublico(buscarAberta(token));
    }

    @Transactional
    public SolicitacaoPublicaDTO receberArquivo(String token, MultipartFile file) throws IOException {
        SolicitacaoDocumento solicitacao = buscarAberta(token);
        if (solicitacao.getArquivosRecebidos() >= MAX_ARQUIVOS) {
            throw new RegraNegocioException("Limite de " + MAX_ARQUIVOS + " arquivos atingido para este pedido");
        }
        if (file == null || file.isEmpty()) {
            throw new RegraNegocioException("Selecione um arquivo");
        }
        if (file.getSize() > TAMANHO_MAXIMO) {
            throw new RegraNegocioException("Arquivo maior que 15 MB");
        }
        if (ClienteDocumentoService.tipoPermitido(file.getOriginalFilename()) == null) {
            throw new RegraNegocioException("Tipo não permitido. Envie PDF, imagem, XML, planilha ou documento");
        }

        documentoService.salvarRecebidoPorLink(
                solicitacao.getCliente(), file, solicitacao.getTitulo(), solicitacao.getCompetencia());
        solicitacao.setArquivosRecebidos(solicitacao.getArquivosRecebidos() + 1);
        solicitacao.setStatus(SolicitacaoDocumento.RECEBIDO);
        solicitacao.setRecebidoEm(LocalDateTime.now());
        alertarEquipe(solicitacao);
        return toPublico(solicitacao);
    }

    private void alertarEquipe(SolicitacaoDocumento solicitacao) {
        Cliente cliente = solicitacao.getCliente();
        String titulo = "Documento recebido: " + cliente.getRazaoSocial();
        if (titulo.length() > 200) {
            titulo = titulo.substring(0, 200);
        }
        // Um alerta por pedido a cada hora: um lote de arquivos não vira vários avisos
        String chave = "DOC_LINK:" + solicitacao.getId() + ":" + LocalDateTime.now().truncatedTo(ChronoUnit.HOURS);
        for (Usuario destinatario : destinatarios(cliente.getId())) {
            notificationService.criarSeNaoExiste(destinatario, null, titulo, solicitacao.getTitulo(), "alta",
                    "DOCUMENTO_RECEBIDO", chave, "/clientes/" + cliente.getId());
        }
    }

    /** Responsáveis ativos do cliente; sem nenhum, a direção recebe para o documento não passar despercebido. */
    private Collection<Usuario> destinatarios(Long clienteId) {
        Map<Long, Usuario> responsaveis = new LinkedHashMap<>();
        for (ClienteResponsavel responsavel : responsavelRepository.findAtivosByClienteId(clienteId)) {
            Usuario usuario = responsavel.getUsuario();
            if (Boolean.TRUE.equals(usuario.getAtivo())) {
                responsaveis.put(usuario.getId(), usuario);
            }
        }
        if (!responsaveis.isEmpty()) {
            return responsaveis.values();
        }
        return usuarioRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getAtivo()))
                .filter(u -> u.getPerfil() == Perfil.ADMIN || u.getPerfil() == Perfil.SOCIO)
                .toList();
    }

    private SolicitacaoDocumento buscarAberta(String token) {
        return repository.findByTokenHash(hash(token))
                .filter(s -> s.aceitaEnvio(LocalDateTime.now()))
                .orElseThrow(() -> new SolicitacaoDocumentoNaoEncontradaException(LINK_INVALIDO));
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private String vazioParaNulo(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

    private SolicitacaoPublicaDTO toPublico(SolicitacaoDocumento s) {
        Cliente c = s.getCliente();
        return new SolicitacaoPublicaDTO(
                c.getNomeFantasia() != null ? c.getNomeFantasia() : c.getRazaoSocial(),
                s.getTitulo(),
                s.getDescricao(),
                s.getCompetencia(),
                s.getExpiraEm(),
                s.getArquivosRecebidos(),
                MAX_ARQUIVOS - s.getArquivosRecebidos());
    }

    private SolicitacaoDocumentoDTO toDto(SolicitacaoDocumento s, String token) {
        return new SolicitacaoDocumentoDTO(
                s.getId(),
                s.getCliente().getId(),
                s.getTitulo(),
                s.getDescricao(),
                s.getCompetencia(),
                s.getStatus(),
                !s.getExpiraEm().isAfter(LocalDateTime.now()),
                s.getExpiraEm(),
                s.getCriadoEm(),
                s.getRecebidoEm(),
                s.getArquivosRecebidos(),
                token);
    }
}
