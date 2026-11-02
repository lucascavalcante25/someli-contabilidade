package br.com.someli.controller;

import br.com.someli.dto.InscricaoEstadualConsultaDTO;
import br.com.someli.service.InscricaoEstadualService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InscricaoEstadualController {

    private final InscricaoEstadualService inscricaoEstadualService;

    public InscricaoEstadualController(InscricaoEstadualService inscricaoEstadualService) {
        this.inscricaoEstadualService = inscricaoEstadualService;
    }

    @GetMapping("/someli/api/inscricao-estadual/{cnpj}")
    public ResponseEntity<InscricaoEstadualConsultaDTO> consultar(@PathVariable String cnpj) {
        return ResponseEntity.ok(inscricaoEstadualService.consultar(cnpj));
    }
}
