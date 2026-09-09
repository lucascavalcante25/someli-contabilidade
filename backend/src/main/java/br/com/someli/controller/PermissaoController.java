package br.com.someli.controller;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.PermissaoDTO;
import br.com.someli.dto.UpdateUsuarioPermissoesRequestDTO;
import br.com.someli.dto.UsuarioPermissoesDTO;
import br.com.someli.service.AuthorizationService;
import br.com.someli.service.PermissaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/permissoes")
public class PermissaoController {

    private final PermissaoService permissaoService;
    private final AuthorizationService authorizationService;

    public PermissaoController(PermissaoService permissaoService, AuthorizationService authorizationService) {
        this.permissaoService = permissaoService;
        this.authorizationService = authorizationService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> minhas() {
        Set<String> efetivas = authorizationService.permissoesDoUsuarioAtual();
        return ResponseEntity.ok(Map.of(
                "permissoes", efetivas.stream().sorted().toList(),
                "alcadaGlobal", authorizationService.hasAlcadaGlobal(authorizationService.currentUser()),
                "podeVerHonorario", efetivas.contains(PermissaoCodigo.HONORARIO_VISUALIZAR)
        ));
    }

    @GetMapping("/catalogo")
    public ResponseEntity<List<PermissaoDTO>> catalogo() {
        return ResponseEntity.ok(permissaoService.listarCatalogo());
    }

    @GetMapping("/perfil/{perfil}")
    public ResponseEntity<List<String>> porPerfil(@PathVariable String perfil) {
        authorizationService.requirePermission(PermissaoCodigo.USUARIOS_PERMISSOES);
        return ResponseEntity.ok(permissaoService.permissoesDoPerfil(perfil));
    }

    @GetMapping("/usuarios/{usuarioId}")
    public ResponseEntity<UsuarioPermissoesDTO> doUsuario(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(permissaoService.obterPermissoesUsuario(usuarioId));
    }

    @PutMapping("/usuarios/{usuarioId}")
    public ResponseEntity<UsuarioPermissoesDTO> atualizar(
            @PathVariable Long usuarioId,
            @RequestBody UpdateUsuarioPermissoesRequestDTO request) {
        return ResponseEntity.ok(permissaoService.atualizarPermissoes(usuarioId, request));
    }

    @PutMapping("/usuarios/{usuarioId}/reset")
    public ResponseEntity<UsuarioPermissoesDTO> reset(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(permissaoService.resetarParaPerfil(usuarioId));
    }
}
