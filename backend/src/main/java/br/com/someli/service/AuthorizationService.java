package br.com.someli.service;

import br.com.someli.domain.Perfil;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.domain.UsuarioPermissao;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.PerfilPermissaoRepository;
import br.com.someli.repository.UsuarioPermissaoRepository;
import br.com.someli.security.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Fonte única de autorização: permissões granulares + alçada sobre clientes.
 * Frontend apenas reflete o que este serviço autoriza.
 */
@Service
public class AuthorizationService {

    private final SecurityUtils securityUtils;
    private final PerfilPermissaoRepository perfilPermissaoRepository;
    private final UsuarioPermissaoRepository usuarioPermissaoRepository;
    private final ClienteResponsavelRepository clienteResponsavelRepository;

    public AuthorizationService(SecurityUtils securityUtils,
                                PerfilPermissaoRepository perfilPermissaoRepository,
                                UsuarioPermissaoRepository usuarioPermissaoRepository,
                                ClienteResponsavelRepository clienteResponsavelRepository) {
        this.securityUtils = securityUtils;
        this.perfilPermissaoRepository = perfilPermissaoRepository;
        this.usuarioPermissaoRepository = usuarioPermissaoRepository;
        this.clienteResponsavelRepository = clienteResponsavelRepository;
    }

    @Transactional(readOnly = true)
    public Set<String> resolvePermissoes(Usuario usuario) {
        if (usuario == null) return Set.of();
        if ("CLIENTE".equalsIgnoreCase(usuario.getTipoUsuario()) || usuario.getPerfil() == Perfil.CLIENTE) {
            // Portal do cliente: camada separada — sem permissões internas.
            return Set.of();
        }

        Set<String> efetivas = perfilPermissaoRepository.findByPerfil(usuario.getPerfil().name()).stream()
                .map(pp -> pp.getPermissao().getCodigo())
                .collect(Collectors.toCollection(HashSet::new));

        for (UsuarioPermissao up : usuarioPermissaoRepository.findByUsuarioId(usuario.getId())) {
            String codigo = up.getPermissao().getCodigo();
            if (Boolean.TRUE.equals(up.getConcedida())) {
                efetivas.add(codigo);
            } else {
                efetivas.remove(codigo);
            }
        }

        if (Boolean.TRUE.equals(usuario.getAlcadaGlobal()) || usuario.getPerfil() == Perfil.ADMIN) {
            efetivas.add(PermissaoCodigo.ALCADA_GLOBAL);
        }
        return efetivas;
    }

    @Transactional(readOnly = true)
    public Set<String> permissoesDoUsuarioAtual() {
        return resolvePermissoes(securityUtils.requireCurrentUser());
    }

    public boolean hasPermission(Usuario usuario, String codigo) {
        return resolvePermissoes(usuario).contains(codigo);
    }

    public boolean hasPermission(String codigo) {
        return hasPermission(securityUtils.requireCurrentUser(), codigo);
    }

    public void requirePermission(String codigo) {
        if (!hasPermission(codigo)) {
            throw new AcessoNegadoException("Sem permissão: " + codigo);
        }
    }

    public boolean canAccessModule(String modulo) {
        Set<String> perms = permissoesDoUsuarioAtual();
        return switch (modulo.toUpperCase()) {
            case "DASHBOARD" -> perms.contains(PermissaoCodigo.DASHBOARD_VISUALIZAR);
            case "CONSULTAS" -> perms.contains(PermissaoCodigo.CONSULTAS_VISUALIZAR);
            case "CLIENTES" -> perms.contains(PermissaoCodigo.CLIENTES_VISUALIZAR);
            case "OBRIGACOES", "OBRIGACOES_TIPOS" -> perms.contains(PermissaoCodigo.OBRIGACOES_VISUALIZAR)
                    || perms.contains(PermissaoCodigo.OBRIGACOES_TIPOS_GERENCIAR);
            case "FINANCEIRO" -> perms.contains(PermissaoCodigo.FINANCEIRO_VISUALIZAR);
            case "DESPESAS" -> perms.contains(PermissaoCodigo.DESPESAS_VISUALIZAR);
            case "USUARIOS", "ADMINISTRACAO" -> perms.contains(PermissaoCodigo.USUARIOS_VISUALIZAR)
                    || perms.contains(PermissaoCodigo.ADMINISTRACAO_VISUALIZAR);
            case "HONORARIOS" -> perms.contains(PermissaoCodigo.HONORARIO_VISUALIZAR);
            default -> false;
        };
    }

    public void requireModule(String modulo) {
        if (!canAccessModule(modulo)) {
            throw new AcessoNegadoException("Sem acesso ao módulo: " + modulo);
        }
    }

    public boolean canViewFinancialData(Usuario usuario) {
        return hasPermission(usuario, PermissaoCodigo.HONORARIO_VISUALIZAR)
                || hasPermission(usuario, PermissaoCodigo.FINANCEIRO_VISUALIZAR);
    }

    public boolean canViewHonorario() {
        return hasPermission(PermissaoCodigo.HONORARIO_VISUALIZAR);
    }

    public boolean hasAlcadaGlobal(Usuario usuario) {
        if (usuario == null) return false;
        if (Boolean.TRUE.equals(usuario.getAlcadaGlobal())) return true;
        if (usuario.getPerfil() == Perfil.ADMIN || usuario.getPerfil() == Perfil.SOCIO) return true;
        return hasPermission(usuario, PermissaoCodigo.ALCADA_GLOBAL);
    }

    /**
     * Alçada sobre cliente: global OU responsável em qualquer setor OU gerente de conta.
     */
    @Transactional(readOnly = true)
    public boolean canAccessCompany(Usuario usuario, Long clienteId) {
        if (usuario == null || clienteId == null) return false;
        if (hasAlcadaGlobal(usuario)) return true;
        return clienteResponsavelRepository.existsByClienteIdAndUsuarioIdAndAtivoTrue(clienteId, usuario.getId());
    }

    public boolean canAccessCompany(Long clienteId) {
        return canAccessCompany(securityUtils.requireCurrentUser(), clienteId);
    }

    public void requireCompanyAccess(Long clienteId) {
        if (!canAccessCompany(clienteId)) {
            throw new AcessoNegadoException("Sem alçada sobre este cliente");
        }
    }

    /**
     * Alçada por setor: responsável daquele setor, gerente de conta, alçada global ou ALCADA_SETOR.
     */
    @Transactional(readOnly = true)
    public boolean canAccessDepartment(Usuario usuario, Long clienteId, String setor) {
        if (canAccessCompany(usuario, clienteId) && hasAlcadaGlobal(usuario)) return true;
        if (hasPermission(usuario, PermissaoCodigo.ALCADA_SETOR) && canAccessCompany(usuario, clienteId)) {
            return true;
        }
        if (clienteResponsavelRepository.existsByClienteIdAndUsuarioIdAndSetorAndAtivoTrue(
                clienteId, usuario.getId(), setor)) {
            return true;
        }
        return clienteResponsavelRepository.existsByClienteIdAndUsuarioIdAndSetorAndAtivoTrue(
                clienteId, usuario.getId(), "GERENTE_CONTA");
    }

    public void requireDepartmentAccess(Long clienteId, String setor) {
        Usuario u = securityUtils.requireCurrentUser();
        if (!canAccessDepartment(u, clienteId, setor)) {
            throw new AcessoNegadoException("Sem alçada no setor " + setor + " para este cliente");
        }
    }

    @Transactional(readOnly = true)
    public List<Long> clienteIdsNaAlcada(Usuario usuario) {
        if (hasAlcadaGlobal(usuario)) {
            return null; // null = todos
        }
        return clienteResponsavelRepository.findClienteIdsByUsuarioId(usuario.getId());
    }

    public List<Long> clienteIdsNaAlcadaAtual() {
        return clienteIdsNaAlcada(securityUtils.requireCurrentUser());
    }

    public Usuario currentUser() {
        return securityUtils.requireCurrentUser();
    }
}
