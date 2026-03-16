package br.com.someli.controller;

import br.com.someli.dto.CnpjResponseDTO;
import br.com.someli.service.CnpjService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CnpjController {

    private final CnpjService cnpjService;

    public CnpjController(CnpjService cnpjService) {
        this.cnpjService = cnpjService;
    }

    @GetMapping("/someli/api/consultaCNPJ/{cnpj}")
    public ResponseEntity<CnpjResponseDTO> consultarCnpj(@PathVariable String cnpj) {
        String sanitizedCnpj = cnpj.replaceAll("\\D", "");
        return ResponseEntity.ok(cnpjService.consultarCnpj(sanitizedCnpj));
    }
}
