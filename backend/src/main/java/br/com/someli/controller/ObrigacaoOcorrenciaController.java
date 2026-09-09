package br.com.someli.controller;

import br.com.someli.domain.ObrigacaoOcorrenciaEvento;
import br.com.someli.dto.ObrigacaoOcorrenciaDTO;
import br.com.someli.mapper.ObrigacaoOcorrenciaMapper;
import br.com.someli.service.ObrigacaoOcorrenciaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping
public class ObrigacaoOcorrenciaController {

    private final ObrigacaoOcorrenciaService service;

    public ObrigacaoOcorrenciaController(ObrigacaoOcorrenciaService service) {
        this.service = service;
    }

    @GetMapping("/clientes/{clienteId}/ocorrencias")
    public ResponseEntity<List<ObrigacaoOcorrenciaDTO>> listarPorCliente(@PathVariable Long clienteId) {
        return ResponseEntity.ok(service.listarPorCliente(clienteId).stream().map(ObrigacaoOcorrenciaMapper::toDto).toList());
    }

    @GetMapping("/ocorrencias/{id}")
    public ResponseEntity<ObrigacaoOcorrenciaDTO> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(ObrigacaoOcorrenciaMapper.toDto(service.buscar(id)));
    }

    @PutMapping("/ocorrencias/{id}/status")
    public ResponseEntity<ObrigacaoOcorrenciaDTO> atualizarStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        return ResponseEntity.ok(ObrigacaoOcorrenciaMapper.toDto(service.atualizarStatus(id, status)));
    }

    @GetMapping("/ocorrencias/{id}/eventos")
    public ResponseEntity<List<Map<String, Object>>> historico(@PathVariable Long id) {
        List<ObrigacaoOcorrenciaEvento> eventos = service.historico(id);
        return ResponseEntity.ok(eventos.stream().map(e -> Map.<String, Object>of(
                "id", e.getId(),
                "tipoEvento", e.getTipoEvento(),
                "statusAnterior", e.getStatusAnterior() != null ? e.getStatusAnterior() : "",
                "statusNovo", e.getStatusNovo() != null ? e.getStatusNovo() : "",
                "mensagem", e.getMensagem() != null ? e.getMensagem() : "",
                "usuarioNome", e.getUsuario() != null ? e.getUsuario().getNome() : "",
                "createdAt", e.getCreatedAt().toString()
        )).toList());
    }
}
