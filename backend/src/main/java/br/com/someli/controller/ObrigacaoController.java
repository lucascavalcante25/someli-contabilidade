package br.com.someli.controller;

import br.com.someli.dto.CreateObrigacaoRequestDTO;
import br.com.someli.dto.ObrigacaoDTO;
import br.com.someli.dto.UpdateObrigacaoRequestDTO;
import br.com.someli.mapper.ObrigacaoMapper;
import br.com.someli.service.ObrigacaoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/obrigacoes")
public class ObrigacaoController {

    private final ObrigacaoService obrigacaoService;
    private final ObrigacaoMapper obrigacaoMapper;

    public ObrigacaoController(ObrigacaoService obrigacaoService, ObrigacaoMapper obrigacaoMapper) {
        this.obrigacaoService = obrigacaoService;
        this.obrigacaoMapper = obrigacaoMapper;
    }

    @GetMapping
    public ResponseEntity<List<ObrigacaoDTO>> listarTodas() {
        return ResponseEntity.ok(
                obrigacaoService.listarTodas().stream()
                        .map(obrigacaoMapper::toDto)
                        .toList()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ObrigacaoDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(obrigacaoMapper.toDto(obrigacaoService.buscarPorId(id)));
    }

    @PostMapping
    public ResponseEntity<ObrigacaoDTO> criar(@Valid @RequestBody CreateObrigacaoRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(obrigacaoMapper.toDto(obrigacaoService.criar(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ObrigacaoDTO> atualizar(@PathVariable Long id, @Valid @RequestBody UpdateObrigacaoRequestDTO request) {
        return ResponseEntity.ok(obrigacaoMapper.toDto(obrigacaoService.atualizar(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        obrigacaoService.remover(id);
        return ResponseEntity.noContent().build();
    }
}
