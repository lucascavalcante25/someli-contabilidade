package br.com.someli.controller;

import br.com.someli.dto.AplicarTemplateRequestDTO;
import br.com.someli.dto.ObrigacaoTemplateDTO;
import br.com.someli.service.ObrigacaoTemplateService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/obrigacao-templates")
public class ObrigacaoTemplateController {

    private final ObrigacaoTemplateService service;

    public ObrigacaoTemplateController(ObrigacaoTemplateService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ObrigacaoTemplateDTO>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @GetMapping("/{codigo}")
    public ResponseEntity<ObrigacaoTemplateDTO> buscar(@PathVariable String codigo) {
        return ResponseEntity.ok(service.buscarPorCodigo(codigo));
    }

    @PostMapping("/{codigo}/aplicar")
    public ResponseEntity<Map<String, Object>> aplicar(
            @PathVariable String codigo,
            @Valid @RequestBody AplicarTemplateRequestDTO request) {
        return ResponseEntity.ok(service.aplicar(codigo, request));
    }
}
