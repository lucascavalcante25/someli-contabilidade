package br.com.someli.controller;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.CreateDespesaRequestDTO;
import br.com.someli.dto.DespesaDTO;
import br.com.someli.dto.UpdateDespesaRequestDTO;
import br.com.someli.service.AuthorizationService;
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
    private final AuthorizationService authorizationService;

    public DespesaController(DespesaService despesaService, AuthorizationService authorizationService) {
        this.despesaService = despesaService;
        this.authorizationService = authorizationService;
    }

    @GetMapping
    public ResponseEntity<List<DespesaDTO>> listarTodas() {
        authorizationService.requirePermission(PermissaoCodigo.DESPESAS_VISUALIZAR);
        return ResponseEntity.ok(despesaService.listarTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DespesaDTO> buscarPorId(@PathVariable Long id) {
        authorizationService.requirePermission(PermissaoCodigo.DESPESAS_VISUALIZAR);
        return ResponseEntity.ok(despesaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<DespesaDTO> criar(@Valid @RequestBody CreateDespesaRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.DESPESAS_EDITAR);
        return ResponseEntity.status(HttpStatus.CREATED).body(despesaService.criar(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DespesaDTO> atualizar(@PathVariable Long id,
                                                @Valid @RequestBody UpdateDespesaRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.DESPESAS_EDITAR);
        return ResponseEntity.ok(despesaService.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        authorizationService.requirePermission(PermissaoCodigo.DESPESAS_EDITAR);
        despesaService.remover(id);
        return ResponseEntity.noContent().build();
    }
}
