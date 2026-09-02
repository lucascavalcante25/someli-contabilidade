package br.com.someli.controller;

import br.com.someli.dto.UpdateAccountRequestDTO;
import br.com.someli.dto.UsuarioDTO;
import br.com.someli.mapper.UsuarioMapper;
import br.com.someli.service.AccountService;
import br.com.someli.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;

@RestController
@RequestMapping("/account")
public class AccountController {

    private final AccountService accountService;
    private final UsuarioService usuarioService;
    private final UsuarioMapper usuarioMapper;

    public AccountController(
            AccountService accountService,
            UsuarioService usuarioService,
            UsuarioMapper usuarioMapper
    ) {
        this.accountService = accountService;
        this.usuarioService = usuarioService;
        this.usuarioMapper = usuarioMapper;
    }

    @GetMapping
    public ResponseEntity<UsuarioDTO> me() {
        return ResponseEntity.ok(usuarioMapper.toDto(accountService.obterAtual()));
    }

    @PutMapping
    public ResponseEntity<UsuarioDTO> atualizar(@Valid @RequestBody UpdateAccountRequestDTO request) {
        return ResponseEntity.ok(usuarioMapper.toDto(accountService.atualizarAtual(request)));
    }

    @PostMapping("/foto")
    public ResponseEntity<UsuarioDTO> uploadFoto(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(usuarioMapper.toDto(accountService.uploadFotoAtual(file)));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/foto")
    public ResponseEntity<Resource> baixarFoto() {
        try {
            Long id = accountService.obterAtual().getId();
            Path path = usuarioService.obterCaminhoFoto(id);
            if (path == null || !path.toFile().exists()) {
                return ResponseEntity.notFound().build();
            }
            Resource resource = new UrlResource(path.toUri());
            String name = path.getFileName().toString().toLowerCase();
            MediaType mediaType = MediaType.IMAGE_JPEG;
            if (name.endsWith(".png")) mediaType = MediaType.IMAGE_PNG;
            else if (name.endsWith(".gif")) mediaType = MediaType.IMAGE_GIF;
            else if (name.endsWith(".webp")) mediaType = MediaType.parseMediaType("image/webp");
            return ResponseEntity.ok().contentType(mediaType).body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
