package br.com.someli.service;

import br.com.someli.domain.Usuario;
import br.com.someli.exception.UsuarioNaoEncontradoException;
import br.com.someli.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthorizationService authorizationService;
    @Mock private AuditLogService auditLogService;

    private UsuarioService usuarioService;

    @BeforeEach
    void setUp() {
        usuarioService = new UsuarioService(
                usuarioRepository, passwordEncoder, "./data/uploads",
                authorizationService, auditLogService);
    }

    @Test
    void deveBuscarUsuarioPorCpf() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setCpf("11111111111");

        when(usuarioRepository.findByCpf("11111111111")).thenReturn(Optional.of(usuario));

        Usuario resultado = usuarioService.buscarPorCpf("11111111111");
        assertThat(resultado.getId()).isEqualTo(1L);
    }

    @Test
    void deveLancarExcecaoQuandoCpfNaoExiste() {
        when(usuarioRepository.findByCpf("00000000000")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> usuarioService.buscarPorCpf("00000000000"))
                .isInstanceOf(UsuarioNaoEncontradoException.class)
                .hasMessageContaining("Usuario nao encontrado");
    }
}
