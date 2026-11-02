package br.com.someli.controller;

import br.com.someli.dto.CreateSolicitacaoDocumentoDTO;
import br.com.someli.dto.SolicitacaoDocumentoDTO;
import br.com.someli.dto.SolicitacaoPublicaDTO;
import br.com.someli.service.SolicitacaoDocumentoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
public class SolicitacaoDocumentoController {

    private final SolicitacaoDocumentoService service;

    public SolicitacaoDocumentoController(SolicitacaoDocumentoService service) {
        this.service = service;
    }

    @GetMapping("/clientes/{clienteId}/solicitacoes-documento")
    public ResponseEntity<List<SolicitacaoDocumentoDTO>> listar(@PathVariable Long clienteId) {
        return ResponseEntity.ok(service.listar(clienteId));
    }

    @PostMapping("/clientes/{clienteId}/solicitacoes-documento")
    public ResponseEntity<SolicitacaoDocumentoDTO> criar(
            @PathVariable Long clienteId,
            @Valid @RequestBody CreateSolicitacaoDocumentoDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(clienteId, request));
    }

    @DeleteMapping("/clientes/{clienteId}/solicitacoes-documento/{id}")
    public ResponseEntity<Void> cancelar(@PathVariable Long clienteId, @PathVariable Long id) {
        service.cancelar(clienteId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/publico/solicitacoes/{token}")
    public ResponseEntity<SolicitacaoPublicaDTO> buscarPublico(@PathVariable String token) {
        return ResponseEntity.ok(service.buscarPublico(token));
    }

    @PostMapping("/publico/solicitacoes/{token}/arquivos")
    public ResponseEntity<SolicitacaoPublicaDTO> enviar(
            @PathVariable String token,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(service.receberArquivo(token, file));
    }
}
