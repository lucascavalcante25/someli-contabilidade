package br.com.someli.service;

import br.com.someli.domain.Perfil;
import br.com.someli.domain.Permissao;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.PerfilPermissaoRepository;
import br.com.someli.repository.UsuarioPermissaoRepository;
import br.com.someli.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthorizationServiceTest {

    @Mock SecurityUtils securityUtils;
    @Mock PerfilPermissaoRepository perfilPermissaoRepository;
    @Mock UsuarioPermissaoRepository usuarioPermissaoRepository;
    @Mock ClienteResponsavelRepository clienteResponsavelRepository;

    AuthorizationService service;

    @BeforeEach
    void setUp() {
        service = new AuthorizationService(
                securityUtils, perfilPermissaoRepository,
                usuarioPermissaoRepository, clienteResponsavelRepository);
    }

    private Usuario usuario(Long id, Perfil perfil, boolean alcadaGlobal) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setPerfil(perfil);
        u.setAlcadaGlobal(alcadaGlobal);
        u.setAtivo(true);
        u.setTipoUsuario("INTERNO");
        return u;
    }

    private br.com.someli.domain.PerfilPermissao pp(String codigo) {
        Permissao p = new Permissao();
        p.setCodigo(codigo);
        br.com.someli.domain.PerfilPermissao pp = new br.com.someli.domain.PerfilPermissao();
        pp.setPermissao(p);
        return pp;
    }

    @Test
    void cenario1_hemersonAcessaEmpresaA_permitido_empresaB_negado() {
        Usuario hemerson = usuario(10L, Perfil.FISCAL, false);
        when(perfilPermissaoRepository.findByPerfil("FISCAL")).thenReturn(List.of(
                pp(PermissaoCodigo.CLIENTES_VISUALIZAR),
                pp(PermissaoCodigo.OBRIGACOES_VISUALIZAR)
        ));
        when(usuarioPermissaoRepository.findByUsuarioId(10L)).thenReturn(List.of());
        when(clienteResponsavelRepository.existsByClienteIdAndUsuarioIdAndAtivoTrue(1L, 10L)).thenReturn(true);
        when(clienteResponsavelRepository.existsByClienteIdAndUsuarioIdAndAtivoTrue(2L, 10L)).thenReturn(false);

        assertTrue(service.canAccessCompany(hemerson, 1L));
        assertFalse(service.canAccessCompany(hemerson, 2L));
    }

    @Test
    void cenario2_semHonorarioVisualizar() {
        Usuario u = usuario(11L, Perfil.OPERADOR, false);
        when(perfilPermissaoRepository.findByPerfil("OPERADOR")).thenReturn(List.of(
                pp(PermissaoCodigo.CLIENTES_VISUALIZAR)
        ));
        when(usuarioPermissaoRepository.findByUsuarioId(11L)).thenReturn(List.of());

        assertFalse(service.hasPermission(u, PermissaoCodigo.HONORARIO_VISUALIZAR));
        assertFalse(service.canViewFinancialData(u));
    }

    @Test
    void cenario3_semFinanceiro_moduloBloqueado() {
        Usuario u = usuario(12L, Perfil.OPERADOR, false);
        when(securityUtils.requireCurrentUser()).thenReturn(u);
        when(perfilPermissaoRepository.findByPerfil("OPERADOR")).thenReturn(List.of(
                pp(PermissaoCodigo.DASHBOARD_VISUALIZAR),
                pp(PermissaoCodigo.CLIENTES_VISUALIZAR)
        ));
        when(usuarioPermissaoRepository.findByUsuarioId(12L)).thenReturn(List.of());

        assertFalse(service.canAccessModule("FINANCEIRO"));
        assertThrows(AcessoNegadoException.class, () -> service.requirePermission(PermissaoCodigo.FINANCEIRO_VISUALIZAR));
    }

    @Test
    void cenario5_adminAlcadaGlobal() {
        Usuario admin = usuario(1L, Perfil.ADMIN, true);

        assertTrue(service.hasAlcadaGlobal(admin));
        assertTrue(service.canAccessCompany(admin, 999L));
        verify(clienteResponsavelRepository, never())
                .existsByClienteIdAndUsuarioIdAndAtivoTrue(anyLong(), anyLong());
    }

    @Test
    void excecaoRevogaPermissaoHerdada() {
        Usuario u = usuario(20L, Perfil.CONTADOR, false);
        when(perfilPermissaoRepository.findByPerfil("CONTADOR")).thenReturn(List.of(
                pp(PermissaoCodigo.HONORARIO_VISUALIZAR)
        ));
        br.com.someli.domain.UsuarioPermissao revoga = new br.com.someli.domain.UsuarioPermissao();
        Permissao p = new Permissao();
        p.setCodigo(PermissaoCodigo.HONORARIO_VISUALIZAR);
        revoga.setPermissao(p);
        revoga.setConcedida(false);
        when(usuarioPermissaoRepository.findByUsuarioId(20L)).thenReturn(List.of(revoga));

        Set<String> efetivas = service.resolvePermissoes(u);
        assertFalse(efetivas.contains(PermissaoCodigo.HONORARIO_VISUALIZAR));
    }
}
