package br.com.someli.controller;

import br.com.someli.dto.AlertasOperacionaisDTO;
import br.com.someli.service.AlertasOperacionaisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/alertas-operacionais")
public class AlertasOperacionaisController {

    private final AlertasOperacionaisService service;

    public AlertasOperacionaisController(AlertasOperacionaisService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<AlertasOperacionaisDTO> obter() {
        return ResponseEntity.ok(service.obter());
    }
}
