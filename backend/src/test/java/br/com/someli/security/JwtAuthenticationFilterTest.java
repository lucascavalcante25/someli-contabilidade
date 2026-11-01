package br.com.someli.security;

import br.com.someli.domain.Perfil;
import br.com.someli.domain.Usuario;
import br.com.someli.service.UsuarioService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock private JwtService jwtService;
    @Mock private UsuarioService usuarioService;

    private JwtAuthenticationFilter filter;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtService, usuarioService);
        usuario = new Usuario();
        usuario.setCpf("11111111111");
        usuario.setPerfil(Perfil.OPERADOR);
        when(jwtService.tokenValido("token")).thenReturn(true);
        when(jwtService.extrairCpf("token")).thenReturn("11111111111");
        when(usuarioService.buscarPorCpf("11111111111")).thenReturn(usuario);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void limpar() {
        SecurityContextHolder.clearContext();
    }

    private void filtrar() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
    }

    @Test
    void tokenDeUsuarioInativo_naoAutentica() throws Exception {
        usuario.setAtivo(false);

        filtrar();

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void tokenDeUsuarioAtivo_autentica() throws Exception {
        usuario.setAtivo(true);

        filtrar();

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }
}
