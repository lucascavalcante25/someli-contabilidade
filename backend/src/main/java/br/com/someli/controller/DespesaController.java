package br.com.someli.controller;

import br.com.someli.dto.CreateDespesaRequestDTO;
import br.com.someli.dto.DespesaDTO;
import br.com.someli.dto.UpdateDespesaRequestDTO;
import br.com.someli.service.DespesaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/despesas")
public class DespesaController {

    private final DespesaService despesaService;

    public DespesaController(DespesaService despesaService) {
        this.despesaService = despesaService;
    }

    @GetMapping
    public ResponseEntity<List<DespesaDTO>> listarTodas() {
        return ResponseEntity.ok(despesaService.listarTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DespesaDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(despesaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<DespesaDTO> criar(@Valid @RequestBody CreateDespesaRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(despesaService.criar(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DespesaDTO> atualizar(@PathVariable Long id,
                                               @Valid @RequestBody UpdateDespesaRequestDTO request) {
        return ResponseEntity.ok(despesaService.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        despesaService.remover(id);
        return ResponseEntity.noContent().build();
    }
}
