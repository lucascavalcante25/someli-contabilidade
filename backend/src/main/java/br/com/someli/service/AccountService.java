package br.com.someli.service;

import br.com.someli.domain.Usuario;
import br.com.someli.dto.UpdateAccountRequestDTO;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.exception.UsuarioNaoEncontradoException;
import br.com.someli.repository.UsuarioRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class AccountService {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioService usuarioService;
    private final PasswordEncoder passwordEncoder;

    public AccountService(
            UsuarioRepository usuarioRepository,
            UsuarioService usuarioService,
            PasswordEncoder passwordEncoder
    ) {
        this.usuarioRepository = usuarioRepository;
        this.usuarioService = usuarioService;
        this.passwordEncoder = passwordEncoder;
    }

    public Usuario obterAtual() {
        return buscarUsuarioAutenticado();
    }

    public Usuario atualizarAtual(UpdateAccountRequestDTO request) {
        Usuario usuario = buscarUsuarioAutenticado();
        String email = request.getEmail().trim().toLowerCase();
        if (usuarioRepository.existsByEmailAndIdNot(email, usuario.getId())) {
            throw new RegraNegocioException("Já existe usuário cadastrado com esse e-mail");
        }
        usuario.setNome(request.getNome().trim());
        usuario.setEmail(email);
        usuario.setTelefone(request.getTelefone().trim());
        if (request.getSenha() != null && !request.getSenha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(request.getSenha()));
        }
        return usuarioRepository.save(usuario);
    }

    public Usuario uploadFotoAtual(MultipartFile file) throws IOException {
        Usuario usuario = buscarUsuarioAutenticado();
        return usuarioService.uploadFoto(usuario.getId(), file);
    }

    private Usuario buscarUsuarioAutenticado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new UsuarioNaoEncontradoException("Usuário não autenticado");
        }
        String cpf = auth.getName().replaceAll("\\D", "");
        return usuarioRepository.findByCpf(cpf)
                .orElseThrow(() -> new UsuarioNaoEncontradoException("Usuário autenticado não encontrado"));
    }
}
