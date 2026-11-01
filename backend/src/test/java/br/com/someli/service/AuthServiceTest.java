package br.com.someli.service;

import br.com.someli.domain.Usuario;
import br.com.someli.dto.LoginRequestDTO;
import br.com.someli.exception.SenhaInvalidaException;
import br.com.someli.mapper.UsuarioMapper;
import br.com.someli.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UsuarioService usuarioService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private UsuarioMapper usuarioMapper;
    @Mock private AuthorizationService authorizationService;

    private AuthService authService;
    private Usuario usuario;
    private LoginRequestDTO request;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                usuarioService, passwordEncoder, jwtService, usuarioMapper, authorizationService);
        usuario = new Usuario();
        usuario.setCpf("11111111111");
        usuario.setSenha("hash");
        request = new LoginRequestDTO();
        request.setCpf("111.111.111-11");
        request.setSenha("segredo");
        when(usuarioService.buscarPorCpf("11111111111")).thenReturn(usuario);
        when(passwordEncoder.matches("segredo", "hash")).thenReturn(true);
    }

    @Test
    void login_usuarioInativo_recusaSemGerarToken() {
        usuario.setAtivo(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(SenhaInvalidaException.class);

        verify(jwtService, never()).gerarToken(any());
    }

    @Test
    void login_usuarioAtivo_geraToken() {
        usuario.setAtivo(true);
        when(jwtService.gerarToken(usuario)).thenReturn("token");

        assertThat(authService.login(request).getToken()).isEqualTo("token");
    }
}
