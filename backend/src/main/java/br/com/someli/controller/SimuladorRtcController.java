package br.com.someli.controller;

import br.com.someli.dto.SimulacaoRtcCalcularRequest;
import br.com.someli.dto.SimulacaoRtcCenarioDTO;
import br.com.someli.dto.SimulacaoRtcCenarioSalvarRequest;
import br.com.someli.dto.SimulacaoRtcResultadoDTO;
import br.com.someli.dto.SimulacaoRtcVersaoDTO;
import br.com.someli.service.SimuladorRtcService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Simulador CBS/IBS com as calculadoras da Receita. Autorização no service. */
@RestController
public class SimuladorRtcController {

    private final SimuladorRtcService service;

    public SimuladorRtcController(SimuladorRtcService service) {
        this.service = service;
    }

    @GetMapping("/simulador-rtc/versoes")
    public List<SimulacaoRtcVersaoDTO> versoes() {
        return service.versoes();
    }

    @PostMapping("/simulador-rtc/calcular")
    public SimulacaoRtcResultadoDTO calcular(@Valid @RequestBody SimulacaoRtcCalcularRequest request) {
        return service.calcular(request);
    }

    @GetMapping("/clientes/{clienteId}/simulacoes-rtc")
    public List<SimulacaoRtcCenarioDTO> listar(@PathVariable Long clienteId) {
        return service.listarCenarios(clienteId);
    }

    @PostMapping("/clientes/{clienteId}/simulacoes-rtc")
    public ResponseEntity<SimulacaoRtcCenarioDTO> salvar(@PathVariable Long clienteId,
                                                         @Valid @RequestBody SimulacaoRtcCenarioSalvarRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.salvarCenario(clienteId, request));
    }

    @GetMapping("/simulacoes-rtc/{id}")
    public SimulacaoRtcCenarioDTO obter(@PathVariable Long id) {
        return service.obterCenario(id);
    }

    @DeleteMapping("/simulacoes-rtc/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluirCenario(id);
        return ResponseEntity.noContent().build();
    }
}
