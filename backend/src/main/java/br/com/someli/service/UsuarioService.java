package br.com.someli.service;

import br.com.someli.domain.Perfil;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.CreateUsuarioRequestDTO;
import br.com.someli.dto.UpdateUsuarioRequestDTO;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.exception.UsuarioNaoEncontradoException;
import br.com.someli.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final Path basePath;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${app.upload.base-path:./data/uploads}") String basePathStr,
                          AuthorizationService authorizationService,
                          AuditLogService auditLogService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.basePath = Paths.get(basePathStr).toAbsolutePath().normalize();
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
    }

    public List<Usuario> listarTodos() {
        authorizationService.requirePermission(PermissaoCodigo.USUARIOS_VISUALIZAR);
        return usuarioRepository.findAll();
    }

    /** Lista funcionários ativos para seleção de responsáveis (sem exigir permissão de usuários). */
    public List<Usuario> listarAtivosParaSelecao() {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        return usuarioRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getAtivo()))
                .filter(u -> !"CLIENTE".equalsIgnoreCase(u.getTipoUsuario()))
                .toList();
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
        authorizationService.requirePermission(PermissaoCodigo.USUARIOS_CADASTRAR);
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
        if (request.getPerfil() == Perfil.ADMIN) {
            usuario.setAlcadaGlobal(true);
        }
        Usuario salvo = Objects.requireNonNull(usuarioRepository.save(usuario));
        auditLogService.registrar("USUARIO_CRIAR", "USUARIO", String.valueOf(salvo.getId()), null, salvo.getNome());
        return salvo;
    }

    public Usuario atualizar(Long id, UpdateUsuarioRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.USUARIOS_EDITAR);
        Usuario usuario = buscarPorId(id);
        String cpfNormalizado = normalizarCpf(request.getCpf());
        validarDuplicidade(cpfNormalizado, request.getEmail(), id);

        String antes = usuario.getPerfil() + "/" + usuario.getAtivo();
        usuario.setNome(request.getNome());
        usuario.setCpf(cpfNormalizado);
        usuario.setEmail(request.getEmail().trim().toLowerCase());
        usuario.setTelefone(request.getTelefone().trim());
        usuario.setPerfil(request.getPerfil() == null ? Perfil.OPERADOR : request.getPerfil());
        usuario.setAtivo(request.getAtivo());
        if (usuario.getPerfil() == Perfil.ADMIN) {
            usuario.setAlcadaGlobal(true);
        }

        if (request.getSenha() != null && !request.getSenha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(request.getSenha()));
        }

        Usuario salvo = Objects.requireNonNull(usuarioRepository.save(usuario));
        auditLogService.registrar("USUARIO_EDITAR", "USUARIO", String.valueOf(id), antes,
                salvo.getPerfil() + "/" + salvo.getAtivo());
        return salvo;
    }

    public void remover(Long id) {
        Usuario usuario = buscarPorId(id);
        usuarioRepository.delete(Objects.requireNonNull(usuario));
    }

    public Usuario uploadFoto(Long id, MultipartFile file) throws IOException {
        Usuario usuario = buscarPorId(id);
        String nomeOriginal = file.getOriginalFilename() != null ? file.getOriginalFilename() : "foto";
        String extensao = ".jpg";
        int lastDot = nomeOriginal.lastIndexOf('.');
        if (lastDot > 0) {
            extensao = nomeOriginal.substring(lastDot).toLowerCase();
            if (!List.of(".jpg", ".jpeg", ".png", ".gif", ".webp").contains(extensao)) {
                extensao = ".jpg";
            }
        }
        String nomeUnico = "foto" + UUID.randomUUID().toString().replace("-", "").substring(0, 8) + extensao;
        Path usuarioDir = basePath.resolve("usuarios").resolve(id.toString());
        Files.createDirectories(usuarioDir);
        Path targetPath = usuarioDir.resolve(nomeUnico);

        try (InputStream is = file.getInputStream()) {
            Files.copy(is, targetPath, StandardCopyOption.REPLACE_EXISTING);
        }

        String urlRelativa = "usuarios/" + id + "/" + nomeUnico;
        usuario.setFotoUrl(urlRelativa);
        return usuarioRepository.save(usuario);
    }

    public Usuario buscarPorCpfOptional(String cpf) {
        String cpfNorm = cpf == null ? null : cpf.replaceAll("\\D", "");
        if (cpfNorm == null || cpfNorm.length() != 11) return null;
        return usuarioRepository.findByCpf(cpfNorm).orElse(null);
    }

    public Path obterCaminhoFoto(Long id) {
        Usuario usuario = buscarPorId(id);
        if (usuario.getFotoUrl() == null || usuario.getFotoUrl().isBlank()) {
            return null;
        }
        return basePath.resolve(usuario.getFotoUrl()).normalize();
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
