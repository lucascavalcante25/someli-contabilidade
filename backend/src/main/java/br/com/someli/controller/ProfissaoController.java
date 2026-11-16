package br.com.someli.controller;

import br.com.someli.dto.ProfissaoDTO;
import br.com.someli.dto.ProfissaoRequestDTO;
import br.com.someli.service.ProfissaoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Profissões e dias comemorativos (catálogo do escritório). Permissões no service. */
@RestController
@RequestMapping("/profissoes")
public class ProfissaoController {

    private final ProfissaoService service;

    public ProfissaoController(ProfissaoService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ProfissaoDTO>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @PostMapping
    public ResponseEntity<ProfissaoDTO> criar(@Valid @RequestBody ProfissaoRequestDTO request) {
        return ResponseEntity.ok(service.criar(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProfissaoDTO> atualizar(@PathVariable Long id, @Valid @RequestBody ProfissaoRequestDTO request) {
        return ResponseEntity.ok(service.atualizar(id, request));
    }
}
