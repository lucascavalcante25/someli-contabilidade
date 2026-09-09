package br.com.someli.service;

import br.com.someli.domain.Permissao;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.domain.UsuarioPermissao;
import br.com.someli.dto.PermissaoDTO;
import br.com.someli.dto.UpdateUsuarioPermissoesRequestDTO;
import br.com.someli.dto.UsuarioPermissoesDTO;
import br.com.someli.exception.UsuarioNaoEncontradoException;
import br.com.someli.repository.PermissaoRepository;
import br.com.someli.repository.PerfilPermissaoRepository;
import br.com.someli.repository.UsuarioPermissaoRepository;
import br.com.someli.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PermissaoService {

    private final PermissaoRepository permissaoRepository;
    private final PerfilPermissaoRepository perfilPermissaoRepository;
    private final UsuarioPermissaoRepository usuarioPermissaoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;

    public PermissaoService(PermissaoRepository permissaoRepository,
                            PerfilPermissaoRepository perfilPermissaoRepository,
                            UsuarioPermissaoRepository usuarioPermissaoRepository,
                            UsuarioRepository usuarioRepository,
                            AuthorizationService authorizationService,
                            AuditLogService auditLogService) {
        this.permissaoRepository = permissaoRepository;
        this.perfilPermissaoRepository = perfilPermissaoRepository;
        this.usuarioPermissaoRepository = usuarioPermissaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<PermissaoDTO> listarCatalogo() {
        authorizationService.requirePermission(PermissaoCodigo.USUARIOS_PERMISSOES);
        return permissaoRepository.findAllByOrderByModuloAscCodigoAsc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<String> permissoesDoPerfil(String perfil) {
        return perfilPermissaoRepository.findByPerfil(perfil).stream()
                .map(pp -> pp.getPermissao().getCodigo())
                .toList();
    }

    @Transactional(readOnly = true)
    public UsuarioPermissoesDTO obterPermissoesUsuario(Long usuarioId) {
        authorizationService.requirePermission(PermissaoCodigo.USUARIOS_PERMISSOES);
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new UsuarioNaoEncontradoException("Usuário não encontrado"));

        Set<String> herdadas = perfilPermissaoRepository.findByPerfil(usuario.getPerfil().name()).stream()
                .map(pp -> pp.getPermissao().getCodigo())
                .collect(Collectors.toCollection(HashSet::new));

        List<UsuarioPermissao> excecoes = usuarioPermissaoRepository.findByUsuarioId(usuarioId);
        Set<String> concedidas = excecoes.stream().filter(e -> Boolean.TRUE.equals(e.getConcedida()))
                .map(e -> e.getPermissao().getCodigo()).collect(Collectors.toSet());
        Set<String> revogadas = excecoes.stream().filter(e -> Boolean.FALSE.equals(e.getConcedida()))
                .map(e -> e.getPermissao().getCodigo()).collect(Collectors.toSet());

        Set<String> efetivas = authorizationService.resolvePermissoes(usuario);

        UsuarioPermissoesDTO dto = new UsuarioPermissoesDTO();
        dto.setUsuarioId(usuarioId);
        dto.setPerfil(usuario.getPerfil().name());
        dto.setAlcadaGlobal(Boolean.TRUE.equals(usuario.getAlcadaGlobal()) || efetivas.contains(PermissaoCodigo.ALCADA_GLOBAL));
        dto.setHerdadas(herdadas.stream().sorted().toList());
        dto.setConcedidas(concedidas.stream().sorted().toList());
        dto.setRevogadas(revogadas.stream().sorted().toList());
        dto.setEfetivas(efetivas.stream().sorted().toList());
        return dto;
    }

    @Transactional
    public UsuarioPermissoesDTO atualizarPermissoes(Long usuarioId, UpdateUsuarioPermissoesRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.USUARIOS_PERMISSOES);
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new UsuarioNaoEncontradoException("Usuário não encontrado"));

        Set<String> antes = authorizationService.resolvePermissoes(usuario);

        if (request.getAlcadaGlobal() != null) {
            usuario.setAlcadaGlobal(request.getAlcadaGlobal());
            usuarioRepository.save(usuario);
        }

        usuarioPermissaoRepository.deleteByUsuarioId(usuarioId);

        Set<String> herdadas = perfilPermissaoRepository.findByPerfil(usuario.getPerfil().name()).stream()
                .map(pp -> pp.getPermissao().getCodigo())
                .collect(Collectors.toSet());

        Set<String> desejadas = request.getPermissoes() != null
                ? new HashSet<>(request.getPermissoes())
                : new HashSet<>(herdadas);

        for (String codigo : desejadas) {
            if (!herdadas.contains(codigo)) {
                Permissao p = permissaoRepository.findByCodigo(codigo)
                        .orElseThrow(() -> new IllegalArgumentException("Permissão inválida: " + codigo));
                UsuarioPermissao up = new UsuarioPermissao();
                up.setUsuario(usuario);
                up.setPermissao(p);
                up.setConcedida(true);
                usuarioPermissaoRepository.save(up);
            }
        }
        for (String codigo : herdadas) {
            if (!desejadas.contains(codigo)) {
                Permissao p = permissaoRepository.findByCodigo(codigo)
                        .orElseThrow(() -> new IllegalArgumentException("Permissão inválida: " + codigo));
                UsuarioPermissao up = new UsuarioPermissao();
                up.setUsuario(usuario);
                up.setPermissao(p);
                up.setConcedida(false);
                usuarioPermissaoRepository.save(up);
            }
        }

        Set<String> depois = authorizationService.resolvePermissoes(usuario);
        auditLogService.registrar("PERMISSOES_ALTERAR", "USUARIO", String.valueOf(usuarioId),
                String.join(",", antes), String.join(",", depois));

        return obterPermissoesUsuario(usuarioId);
    }

    @Transactional
    public UsuarioPermissoesDTO resetarParaPerfil(Long usuarioId) {
        authorizationService.requirePermission(PermissaoCodigo.USUARIOS_PERMISSOES);
        usuarioPermissaoRepository.deleteByUsuarioId(usuarioId);
        auditLogService.registrar("PERMISSOES_RESET", "USUARIO", String.valueOf(usuarioId), null, "perfil");
        return obterPermissoesUsuario(usuarioId);
    }

    private PermissaoDTO toDto(Permissao p) {
        PermissaoDTO dto = new PermissaoDTO();
        dto.setId(p.getId());
        dto.setCodigo(p.getCodigo());
        dto.setModulo(p.getModulo());
        dto.setDescricao(p.getDescricao());
        dto.setSensivel(p.getSensivel());
        return dto;
    }
}
