package br.com.someli.controller;

import br.com.someli.dto.TagDTO;
import br.com.someli.dto.UpdateClienteTagsRequestDTO;
import br.com.someli.service.TagService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
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
}
