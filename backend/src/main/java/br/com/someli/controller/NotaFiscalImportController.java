package br.com.someli.controller;

import br.com.someli.dto.NotaFiscalImportDTO;
import br.com.someli.dto.RadarFiscalCompetenciaDTO;
import br.com.someli.service.NotaFiscalImportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping
public class NotaFiscalImportController {

    private final NotaFiscalImportService service;

    public NotaFiscalImportController(NotaFiscalImportService service) {
        this.service = service;
    }

    @GetMapping("/clientes/{clienteId}/notas-fiscais")
    public ResponseEntity<List<NotaFiscalImportDTO>> listar(
            @PathVariable Long clienteId,
            @RequestParam(value = "competencia", required = false) String competencia) {
        return ResponseEntity.ok(service.listarPorCliente(clienteId, competencia));
    }

    /** Radar fiscal leve (leitura) — não reativa upload; só resume XMLs já importados. */
    @GetMapping("/clientes/{clienteId}/notas-fiscais/radar")
    public ResponseEntity<List<RadarFiscalCompetenciaDTO>> radar(@PathVariable Long clienteId) {
        return ResponseEntity.ok(service.radarPorCliente(clienteId));
    }

    @PostMapping("/clientes/{clienteId}/notas-fiscais/importar")
    public ResponseEntity<List<NotaFiscalImportDTO>> importarNoCliente(
            @PathVariable Long clienteId,
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "competencia", required = false) String competencia) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.importarLote(clienteId, files, competencia));
    }

    /** Importação em lote com vínculo automático por CNPJ do XML (quando o cliente já existe). */
    @PostMapping("/notas-fiscais/importar")
    public ResponseEntity<Map<String, Object>> importarLoteGlobal(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "competencia", required = false) String competencia) throws IOException {
        List<NotaFiscalImportDTO> result = service.importarLote(null, files, competencia);
        long ok = result.stream().filter(r -> "OK".equals(r.getStatusParse())).count();
        long erro = result.stream().filter(r -> "ERRO".equals(r.getStatusParse())).count();
        long dup = result.stream().filter(r -> "DUPLICADO".equals(r.getStatusParse())).count();
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "total", result.size(),
                "ok", ok,
                "erro", erro,
                "duplicado", dup,
                "itens", result
        ));
    }
}
