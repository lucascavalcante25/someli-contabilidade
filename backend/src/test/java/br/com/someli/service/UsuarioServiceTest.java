package br.com.someli.service;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.UsuarioNaoEncontradoException;
import br.com.someli.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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

    @Test
    void remover_semPermissao_negaENaoExclui() {
        doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.USUARIOS_DESATIVAR);

        assertThatThrownBy(() -> usuarioService.remover(2L))
                .isInstanceOf(AcessoNegadoException.class);

        verify(usuarioRepository, never()).delete(any());
    }

    @Test
    void remover_comPermissao_excluiERegistraAuditoria() {
        Usuario alvo = new Usuario();
        alvo.setId(2L);
        alvo.setNome("Alvo");
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(alvo));

        usuarioService.remover(2L);

        verify(usuarioRepository).delete(alvo);
        verify(auditLogService).registrar("USUARIO_EXCLUIR", "USUARIO", "2", "Alvo", null);
    }

    @Test
    void uploadFoto_deOutroUsuarioSemPermissao_nega() {
        Usuario atual = new Usuario();
        atual.setId(1L);
        when(authorizationService.currentUser()).thenReturn(atual);
        doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.USUARIOS_EDITAR);

        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", new byte[]{1});

        assertThatThrownBy(() -> usuarioService.uploadFoto(2L, file))
                .isInstanceOf(AcessoNegadoException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void uploadFoto_propria_naoExigePermissaoDeEdicao(@TempDir Path dir) throws Exception {
        usuarioService = new UsuarioService(
                usuarioRepository, passwordEncoder, dir.toString(),
                authorizationService, auditLogService);
        Usuario atual = new Usuario();
        atual.setId(1L);
        when(authorizationService.currentUser()).thenReturn(atual);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(atual));
        when(usuarioRepository.save(atual)).thenReturn(atual);

        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", new byte[]{1});

        assertThat(usuarioService.uploadFoto(1L, file).getFotoUrl()).startsWith("usuarios/1/");
        verify(authorizationService, never()).requirePermission(PermissaoCodigo.USUARIOS_EDITAR);
    }
}
