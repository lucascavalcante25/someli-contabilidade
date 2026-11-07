package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteAcesso;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.ClienteAcessoAbertoDTO;
import br.com.someli.dto.ClienteAcessoAtualizarRequest;
import br.com.someli.dto.ClienteAcessoCriarRequest;
import br.com.someli.dto.ClienteAcessoResumoDTO;
import br.com.someli.dto.ClienteAcessoReveladoDTO;
import br.com.someli.dto.Gravacao;
import br.com.someli.exception.ClienteAcessoNaoEncontradoException;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.repository.ClienteAcessoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.security.CofreCrypto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.List;
import java.util.Set;

@Service
public class ClienteAcessoService {

    static final Set<String> SETORES = Set.of("FISCAL", "DEPARTAMENTO_PESSOAL", "CONTABIL", "SOCIETARIO");

    private final ClienteAcessoRepository acessoRepository;
    private final ClienteRepository clienteRepository;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;
    private final CofreCrypto cofreCrypto;
    private final FichaSetorGuard setorGuard;
    private final RevelarRateLimiter revelarRateLimiter;

    public ClienteAcessoService(ClienteAcessoRepository acessoRepository,
                                ClienteRepository clienteRepository,
                                AuthorizationService authorizationService,
                                AuditLogService auditLogService,
                                CofreCrypto cofreCrypto,
                                FichaSetorGuard setorGuard,
                                RevelarRateLimiter revelarRateLimiter) {
        this.acessoRepository = acessoRepository;
        this.clienteRepository = clienteRepository;
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
        this.cofreCrypto = cofreCrypto;
        this.setorGuard = setorGuard;
        this.revelarRateLimiter = revelarRateLimiter;
    }

    @Transactional(readOnly = true)
    public List<ClienteAcessoResumoDTO> listar(Long clienteId) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTE_ACESSOS_VER);
        authorizationService.requireCompanyAccess(clienteId);
        exigirCofre();
        return acessoRepository.findAtivosByClienteId(clienteId).stream()
                .filter(a -> setorGuard.visivel(clienteId, a.getSetor()))
                .map(this::resumo)
                .toList();
    }

    /** Todos os acessos do cliente já em claro. Uma linha de auditoria por abertura da ficha, sem valores. */
    @Transactional
    public List<ClienteAcessoAbertoDTO> listarAbertos(Long clienteId) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTE_ACESSOS_VER);
        authorizationService.requireCompanyAccess(clienteId);
        exigirCofre();
        revelarRateLimiter.consumir(authorizationService.currentUser().getId());
        List<ClienteAcessoAbertoDTO> lista = acessoRepository.findAtivosByClienteId(clienteId).stream()
                .filter(a -> setorGuard.visivel(clienteId, a.getSetor()))
                .map(this::aberto)
                .toList();
        auditLogService.registrar("ACESSOS_VISUALIZADOS", "CLIENTE", String.valueOf(clienteId), null,
                lista.size() + " acesso(s)");
        return lista;
    }

    @Transactional
    public ClienteAcessoReveladoDTO revelar(Long acessoId) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTE_ACESSOS_VER);
        ClienteAcesso acesso = carregarAtivo(acessoId);
        authorizationService.requireCompanyAccess(acesso.getCliente().getId());
        setorGuard.exigir(acesso.getCliente().getId(), acesso.getSetor());
        exigirCofre();
        revelarRateLimiter.consumir(authorizationService.currentUser().getId());
        ClienteAcessoReveladoDTO dto = new ClienteAcessoReveladoDTO(
                acesso.getId(),
                decifrar(acesso.getLogin(), acesso, "login"),
                decifrar(acesso.getSenha(), acesso, "senha"),
                acesso.getObservacao() == null ? null : decifrar(acesso.getObservacao(), acesso, "observacao")
        );
        auditar("ACESSO_REVELADO", acesso);
        return dto;
    }

    @Transactional
    public Gravacao<ClienteAcessoResumoDTO> criar(Long clienteId, ClienteAcessoCriarRequest request) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTE_ACESSOS_EDITAR);
        authorizationService.requireCompanyAccess(clienteId);
        exigirCofre();
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado"));
        String sistema = request.sistema().trim();
        String setor = normalizarSetor(request.setor());
        String origem = normalizarOrigem(request.origem());
        setorGuard.exigir(clienteId, setor);
        if ("TRELLO".equals(origem)) {
            var existentes = acessoRepository.findTrelloPorSistema(clienteId, sistema);
            if (!existentes.isEmpty()) {
                return new Gravacao<>(resumo(existentes.get(0)), false);
            }
        }
        Usuario usuario = authorizationService.currentUser();
        ClienteAcesso acesso = new ClienteAcesso();
        acesso.setCliente(cliente);
        acesso.setSistema(sistema);
        acesso.setUrl(normalizarUrl(request.url()));
        acesso.setSetor(setor);
        acesso.setOrigem(origem);
        acesso.setAtivo(true);
        acesso.setCriadoPor(usuario);
        acesso.setAtualizadoPor(usuario);
        acesso.setLogin(cofreCrypto.cifrarTexto(request.login().trim(), contexto(clienteId, "login")));
        acesso.setSenha(cofreCrypto.cifrarTexto(request.senha(), contexto(clienteId, "senha")));
        acesso.setObservacao(cifrarOpcional(request.observacao(), contexto(clienteId, "observacao")));
        ClienteAcesso salvo = acessoRepository.save(acesso);
        auditar("ACESSO_CRIAR", salvo);
        return new Gravacao<>(resumo(salvo), true);
    }

    @Transactional
    public ClienteAcessoResumoDTO atualizar(Long acessoId, ClienteAcessoAtualizarRequest request) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTE_ACESSOS_EDITAR);
        ClienteAcesso acesso = carregarAtivo(acessoId);
        Long clienteId = acesso.getCliente().getId();
        authorizationService.requireCompanyAccess(clienteId);
        setorGuard.exigir(clienteId, acesso.getSetor());
        exigirCofre();
        String setor = normalizarSetor(request.setor());
        setorGuard.exigir(clienteId, setor);
        acesso.setSistema(request.sistema().trim());
        acesso.setUrl(normalizarUrl(request.url()));
        acesso.setSetor(setor);
        acesso.setAtualizadoPor(authorizationService.currentUser());
        acesso.setLogin(cofreCrypto.cifrarTexto(request.login().trim(), contexto(clienteId, "login")));
        if (request.senha() != null && !request.senha().isBlank()) {
            acesso.setSenha(cofreCrypto.cifrarTexto(request.senha(), contexto(clienteId, "senha")));
        }
        acesso.setObservacao(cifrarOpcional(request.observacao(), contexto(clienteId, "observacao")));
        auditar("ACESSO_ALTERAR", acesso);
        return resumo(acessoRepository.save(acesso));
    }

    @Transactional
    public void desativar(Long acessoId) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTE_ACESSOS_EDITAR);
        ClienteAcesso acesso = carregarAtivo(acessoId);
        authorizationService.requireCompanyAccess(acesso.getCliente().getId());
        setorGuard.exigir(acesso.getCliente().getId(), acesso.getSetor());
        acesso.setAtivo(false);
        acesso.setAtualizadoPor(authorizationService.currentUser());
        acessoRepository.save(acesso);
        auditar("ACESSO_DESATIVAR", acesso);
    }

    public static String mascararLogin(String login) {
        if (login == null) return "•••";
        String texto = login.trim();
        if (texto.length() <= 3) return "•••";
        return texto.substring(0, 3) + "•••";
    }

    static String normalizarUrl(String url) {
        if (url == null || url.isBlank()) return null;
        String valor = url.trim();
        if (valor.length() > 500) {
            throw new IllegalArgumentException("URL muito longa");
        }
        if (!valor.startsWith("https://") && !valor.startsWith("http://")) {
            throw new IllegalArgumentException("URL deve começar com http:// ou https://");
        }
        try {
            URI uri = URI.create(valor);
            if (uri.getHost() == null || uri.getHost().isBlank()) {
                throw new IllegalArgumentException("URL inválida");
            }
            if (uri.getRawUserInfo() != null) {
                throw new IllegalArgumentException("URL não pode conter usuário ou senha");
            }
        } catch (IllegalArgumentException ex) {
            if (ex.getMessage() != null && ex.getMessage().startsWith("URL")) throw ex;
            throw new IllegalArgumentException("URL inválida");
        }
        return valor;
    }

    static String normalizarSetor(String setor) {
        if (setor == null || setor.isBlank()) return null;
        String valor = setor.trim();
        if (!SETORES.contains(valor)) {
            throw new IllegalArgumentException("Setor inválido");
        }
        return valor;
    }

    static String normalizarOrigem(String origem) {
        if (origem == null || origem.isBlank()) return "MANUAL";
        String valor = origem.trim();
        if (!"MANUAL".equals(valor) && !"TRELLO".equals(valor)) {
            throw new IllegalArgumentException("Origem inválida");
        }
        return valor;
    }

    private ClienteAcesso carregarAtivo(Long acessoId) {
        ClienteAcesso acesso = acessoRepository.findDetalheById(acessoId)
                .orElseThrow(ClienteAcessoNaoEncontradoException::new);
        if (!acesso.isAtivo()) {
            throw new ClienteAcessoNaoEncontradoException();
        }
        return acesso;
    }

    private void exigirCofre() {
        if (!cofreCrypto.configurado()) {
            throw new br.com.someli.exception.RegraNegocioException(CofreCrypto.MENSAGEM_DESLIGADO);
        }
    }

    private ClienteAcessoResumoDTO resumo(ClienteAcesso acesso) {
        String login = decifrar(acesso.getLogin(), acesso, "login");
        return new ClienteAcessoResumoDTO(
                acesso.getId(),
                acesso.getCliente().getId(),
                acesso.getSistema(),
                acesso.getUrl(),
                mascararLogin(login),
                acesso.getSetor(),
                acesso.getOrigem(),
                acesso.getAtualizadoPor() == null ? null : acesso.getAtualizadoPor().getNome(),
                acesso.getAtualizadoEm()
        );
    }

    private ClienteAcessoAbertoDTO aberto(ClienteAcesso acesso) {
        return new ClienteAcessoAbertoDTO(
                acesso.getId(),
                acesso.getCliente().getId(),
                acesso.getSistema(),
                acesso.getUrl(),
                decifrar(acesso.getLogin(), acesso, "login"),
                decifrar(acesso.getSenha(), acesso, "senha"),
                acesso.getObservacao() == null ? null : decifrar(acesso.getObservacao(), acesso, "observacao"),
                acesso.getSetor(),
                acesso.getOrigem(),
                acesso.getAtualizadoPor() == null ? null : acesso.getAtualizadoPor().getNome(),
                acesso.getAtualizadoEm()
        );
    }

    private String decifrar(byte[] dado, ClienteAcesso acesso, String campo) {
        return cofreCrypto.decifrarTexto(dado, contexto(acesso.getCliente().getId(), campo));
    }

    private byte[] cifrarOpcional(String texto, String contexto) {
        if (texto == null || texto.isBlank()) return null;
        return cofreCrypto.cifrarTexto(texto.trim(), contexto);
    }

    private static String contexto(Long clienteId, String campo) {
        return "cliente:" + clienteId + ":acesso:" + campo;
    }

    private void auditar(String acao, ClienteAcesso acesso) {
        auditLogService.registrar(acao, "CLIENTE", String.valueOf(acesso.getCliente().getId()), null, acesso.getSistema());
    }
}
