package br.com.someli.controller;

import br.com.someli.dto.TagDTO;
import br.com.someli.dto.UpdateClienteTagsRequestDTO;
import br.com.someli.service.TagService;
import br.com.someli.service.TagSyncService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping
public class TagController {

    private final TagService tagService;
    private final TagSyncService tagSyncService;

    public TagController(TagService tagService, TagSyncService tagSyncService) {
        this.tagService = tagService;
        this.tagSyncService = tagSyncService;
    }

    @GetMapping("/tags")
    public ResponseEntity<List<TagDTO>> listar() {
        return ResponseEntity.ok(tagService.listarTodas());
    }

    @GetMapping("/clientes/{clienteId}/tags")
    public ResponseEntity<List<TagDTO>> porCliente(@PathVariable Long clienteId) {
        return ResponseEntity.ok(tagService.listarPorCliente(clienteId));
    }

    @PutMapping("/clientes/{clienteId}/tags")
    public ResponseEntity<List<TagDTO>> substituir(
            @PathVariable Long clienteId,
            @RequestBody UpdateClienteTagsRequestDTO request) {
        return ResponseEntity.ok(tagService.substituirTagsDoCliente(clienteId, request));
    }

    /** Força ressincronização de tags automáticas (NOVO_CLIENTE / INADIMPLENTE). */
    @PostMapping("/tags/sincronizar")
    public ResponseEntity<Map<String, Object>> sincronizar() {
        int alterados = tagSyncService.sincronizarTodos();
        return ResponseEntity.ok(Map.of("clientesAlterados", alterados));
    }
}

