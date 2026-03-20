package br.com.someli.controller;

import br.com.someli.domain.Usuario;
import br.com.someli.dto.LoginRequestDTO;
import br.com.someli.dto.LoginResponseDTO;
import br.com.someli.service.AuthService;
import br.com.someli.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final UsuarioService usuarioService;

    public AuthController(AuthService authService, UsuarioService usuarioService) {
        this.authService = authService;
        this.usuarioService = usuarioService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/preview")
    public ResponseEntity<Map<String, Object>> preview(@RequestParam String cpf) {
        Usuario u = usuarioService.buscarPorCpfOptional(cpf);
        if (u == null) {
            return ResponseEntity.ok(Map.of("existe", false));
        }
        return ResponseEntity.ok(Map.of(
                "existe", true,
                "id", u.getId(),
                "nome", u.getNome() != null ? u.getNome() : "",
                "hasFoto", u.getFotoUrl() != null && !u.getFotoUrl().isBlank()
        ));
    }

    @GetMapping("/avatar")
    public ResponseEntity<Resource> avatar(@RequestParam String cpf) {
        Usuario u = usuarioService.buscarPorCpfOptional(cpf);
        if (u == null || u.getFotoUrl() == null || u.getFotoUrl().isBlank()) {
            return ResponseEntity.notFound().build();
        }
        try {
            Path path = usuarioService.obterCaminhoFoto(u.getId());
            if (path == null || !path.toFile().exists()) {
                return ResponseEntity.notFound().build();
            }
            Resource resource = new UrlResource(path.toUri());
            String contentType = "image/jpeg";
            String fileName = path.getFileName().toString().toLowerCase();
            if (fileName.endsWith(".png")) contentType = "image/png";
            else if (fileName.endsWith(".gif")) contentType = "image/gif";
            else if (fileName.endsWith(".webp")) contentType = "image/webp";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
