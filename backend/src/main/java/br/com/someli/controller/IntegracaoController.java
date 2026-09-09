package br.com.someli.controller;

import br.com.someli.exception.ExternalApiException;
import br.com.someli.integration.BrasilApiClient;
import br.com.someli.service.DiaUtilService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/integracoes")
public class IntegracaoController {

    private final BrasilApiClient brasilApiClient;
    private final DiaUtilService diaUtilService;

    public IntegracaoController(BrasilApiClient brasilApiClient, DiaUtilService diaUtilService) {
        this.brasilApiClient = brasilApiClient;
        this.diaUtilService = diaUtilService;
    }

    @GetMapping("/cep/{cep}")
    public ResponseEntity<Map<String, Object>> cep(@PathVariable String cep) {
        Map<String, Object> data = brasilApiClient.consultarCep(cep);
        if (data == null || data.isEmpty()) {
            throw new ExternalApiException(HttpStatus.NOT_FOUND, "CEP não encontrado na BrasilAPI");
        }
        return ResponseEntity.ok(data);
    }

    @GetMapping("/feriados/{ano}")
    public ResponseEntity<List<Map<String, String>>> feriados(@PathVariable int ano) {
        List<Map<String, String>> lista = diaUtilService.feriadosDoAno(ano).stream()
                .sorted()
                .map(d -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("date", d.toString());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/dia-util")
    public ResponseEntity<Map<String, Object>> diaUtil(@RequestParam String data) {
        LocalDate original = LocalDate.parse(data);
        LocalDate ajustada = diaUtilService.proximoDiaUtil(original);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("dataOriginal", original.toString());
        body.put("dataAjustada", ajustada.toString());
        body.put("ajustou", !original.equals(ajustada));
        body.put("diaUtil", diaUtilService.isDiaUtil(original));
        return ResponseEntity.ok(body);
    }
}
