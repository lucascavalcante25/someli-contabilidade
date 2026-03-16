package br.com.someli.service;

import br.com.someli.domain.Perfil;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.CreateUsuarioRequestDTO;
import br.com.someli.dto.UpdateUsuarioRequestDTO;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.exception.UsuarioNaoEncontradoException;
import br.com.someli.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<Usuario> listarTodos() {
        return usuarioRepository.findAll();
    }

    public Usuario buscarPorId(Long id) {
        if (id == null) {
            throw new RegraNegocioException("ID do usuario é obrigatório");
        }
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new UsuarioNaoEncontradoException("Usuario nao encontrado para o ID informado"));
    }

    public Usuario buscarPorCpf(String cpf) {
        return usuarioRepository.findByCpf(cpf)
                .orElseThrow(() -> new UsuarioNaoEncontradoException("Usuario nao encontrado para o CPF informado"));
    }

    public Usuario criar(CreateUsuarioRequestDTO request) {
        String cpfNormalizado = normalizarCpf(request.getCpf());
        validarDuplicidade(cpfNormalizado, request.getEmail(), null);

        Usuario usuario = new Usuario();
        usuario.setNome(request.getNome());
        usuario.setCpf(cpfNormalizado);
        usuario.setEmail(request.getEmail().trim().toLowerCase());
        usuario.setTelefone(request.getTelefone().trim());
        usuario.setPerfil(request.getPerfil());
        usuario.setSenha(passwordEncoder.encode(request.getSenha()));
        usuario.setAtivo(request.getAtivo() == null ? Boolean.TRUE : request.getAtivo());
        return Objects.requireNonNull(usuarioRepository.save(usuario));
    }

    public Usuario atualizar(Long id, UpdateUsuarioRequestDTO request) {
        Usuario usuario = buscarPorId(id);
        String cpfNormalizado = normalizarCpf(request.getCpf());
        validarDuplicidade(cpfNormalizado, request.getEmail(), id);

        usuario.setNome(request.getNome());
        usuario.setCpf(cpfNormalizado);
        usuario.setEmail(request.getEmail().trim().toLowerCase());
        usuario.setTelefone(request.getTelefone().trim());
        usuario.setPerfil(request.getPerfil() == null ? Perfil.OPERADOR : request.getPerfil());
        usuario.setAtivo(request.getAtivo());

        if (request.getSenha() != null && !request.getSenha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(request.getSenha()));
        }

        return Objects.requireNonNull(usuarioRepository.save(usuario));
    }

    public void remover(Long id) {
        Usuario usuario = buscarPorId(id);
        usuarioRepository.delete(Objects.requireNonNull(usuario));
    }

    private String normalizarCpf(String cpf) {
        return cpf == null ? null : cpf.replaceAll("\\D", "");
    }

    private void validarDuplicidade(String cpf, String email, Long idIgnorado) {
        String emailNormalizado = email == null ? null : email.trim().toLowerCase();
        boolean cpfDuplicado = idIgnorado == null
                ? usuarioRepository.existsByCpf(cpf)
                : usuarioRepository.existsByCpfAndIdNot(cpf, idIgnorado);
        if (cpfDuplicado) {
            throw new RegraNegocioException("Ja existe usuario cadastrado com esse CPF");
        }

        boolean emailDuplicado = idIgnorado == null
                ? usuarioRepository.existsByEmail(emailNormalizado)
                : usuarioRepository.existsByEmailAndIdNot(emailNormalizado, idIgnorado);
        if (emailDuplicado) {
            throw new RegraNegocioException("Ja existe usuario cadastrado com esse e-mail");
        }
    }
}
