package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteAnotacao;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.ClienteAnotacaoDTO;
import br.com.someli.dto.ClienteAnotacaoSalvarRequest;
import br.com.someli.dto.Gravacao;
import br.com.someli.exception.ClienteAnotacaoNaoEncontradaException;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.repository.ClienteAnotacaoRepository;
import br.com.someli.repository.ClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class ClienteAnotacaoService {

    private final ClienteAnotacaoRepository anotacaoRepository;
    private final ClienteRepository clienteRepository;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;
    private final FichaSetorGuard setorGuard;

    public ClienteAnotacaoService(ClienteAnotacaoRepository anotacaoRepository,
                                  ClienteRepository clienteRepository,
                                  AuthorizationService authorizationService,
                                  AuditLogService auditLogService,
                                  FichaSetorGuard setorGuard) {
        this.anotacaoRepository = anotacaoRepository;
        this.clienteRepository = clienteRepository;
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
        this.setorGuard = setorGuard;
    }

    @Transactional(readOnly = true)
    public List<ClienteAnotacaoDTO> listar(Long clienteId) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        authorizationService.requireCompanyAccess(clienteId);
        return anotacaoRepository.findAtivosByClienteId(clienteId).stream()
                .filter(a -> setorGuard.visivel(clienteId, a.getSetor()))
                .map(this::dto)
                .toList();
    }

    @Transactional
    public Gravacao<ClienteAnotacaoDTO> criar(Long clienteId, ClienteAnotacaoSalvarRequest request) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        authorizationService.requireCompanyAccess(clienteId);
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado"));
        String titulo = titulo(request.titulo());
        String texto = request.texto().trim();
        String setor = ClienteAcessoService.normalizarSetor(request.setor());
        String origem = ClienteAcessoService.normalizarOrigem(request.origem());
        setorGuard.exigir(clienteId, setor);
        if ("TRELLO".equals(origem)) {
            var igual = anotacaoRepository.findTrelloAtivas(clienteId).stream()
                    .filter(a -> Objects.equals(titulo, a.getTitulo()) && texto.equals(a.getTexto()))
                    .findFirst();
            if (igual.isPresent()) {
                return new Gravacao<>(dto(igual.get()), false);
            }
        }
        Usuario usuario = authorizationService.currentUser();
        ClienteAnotacao anotacao = new ClienteAnotacao();
        anotacao.setCliente(cliente);
        anotacao.setTitulo(titulo);
        anotacao.setTexto(texto);
        anotacao.setSetor(setor);
        anotacao.setFixada(Boolean.TRUE.equals(request.fixada()));
        anotacao.setOrigem(origem);
        anotacao.setAtivo(true);
        anotacao.setCriadoPor(usuario);
        anotacao.setAtualizadoPor(usuario);
        ClienteAnotacao salva = anotacaoRepository.save(anotacao);
        auditar("ANOTACAO_CRIAR", salva);
        return new Gravacao<>(dto(salva), true);
    }

    @Transactional
    public ClienteAnotacaoDTO atualizar(Long anotacaoId, ClienteAnotacaoSalvarRequest request) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        ClienteAnotacao anotacao = carregarAtiva(anotacaoId);
        authorizationService.requireCompanyAccess(anotacao.getCliente().getId());
        setorGuard.exigir(anotacao.getCliente().getId(), anotacao.getSetor());
        String titulo = titulo(request.titulo());
        String texto = request.texto().trim();
        String setor = ClienteAcessoService.normalizarSetor(request.setor());
        setorGuard.exigir(anotacao.getCliente().getId(), setor);
        boolean soFixar = anotacao.isFixada() != Boolean.TRUE.equals(request.fixada())
                && Objects.equals(anotacao.getTitulo(), titulo)
                && anotacao.getTexto().equals(texto)
                && Objects.equals(anotacao.getSetor(), setor);
        anotacao.setTitulo(titulo);
        anotacao.setTexto(texto);
        anotacao.setSetor(setor);
        anotacao.setFixada(Boolean.TRUE.equals(request.fixada()));
        anotacao.setAtualizadoPor(authorizationService.currentUser());
        anotacaoRepository.save(anotacao);
        auditar(soFixar ? "ANOTACAO_FIXAR" : "ANOTACAO_ALTERAR", anotacao);
        return dto(anotacao);
    }

    @Transactional
    public void desativar(Long anotacaoId) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        ClienteAnotacao anotacao = carregarAtiva(anotacaoId);
        authorizationService.requireCompanyAccess(anotacao.getCliente().getId());
        setorGuard.exigir(anotacao.getCliente().getId(), anotacao.getSetor());
        anotacao.setAtivo(false);
        anotacao.setAtualizadoPor(authorizationService.currentUser());
        anotacaoRepository.save(anotacao);
        auditar("ANOTACAO_DESATIVAR", anotacao);
    }

    private ClienteAnotacao carregarAtiva(Long id) {
        ClienteAnotacao anotacao = anotacaoRepository.findDetalheById(id)
                .orElseThrow(ClienteAnotacaoNaoEncontradaException::new);
        if (!anotacao.isAtivo()) throw new ClienteAnotacaoNaoEncontradaException();
        return anotacao;
    }

    private ClienteAnotacaoDTO dto(ClienteAnotacao anotacao) {
        return new ClienteAnotacaoDTO(
                anotacao.getId(),
                anotacao.getCliente().getId(),
                anotacao.getTitulo(),
                anotacao.getTexto(),
                anotacao.getSetor(),
                anotacao.isFixada(),
                anotacao.getOrigem(),
                anotacao.getAtualizadoPor() == null ? null : anotacao.getAtualizadoPor().getNome(),
                anotacao.getAtualizadoEm()
        );
    }

    private static String titulo(String titulo) {
        if (titulo == null || titulo.isBlank()) return null;
        return titulo.trim();
    }

    private void auditar(String acao, ClienteAnotacao anotacao) {
        String referencia = anotacao.getTitulo() == null || anotacao.getTitulo().isBlank()
                ? "anotação"
                : anotacao.getTitulo();
        auditLogService.registrar(acao, "CLIENTE", String.valueOf(anotacao.getCliente().getId()), null, referencia);
    }
}
