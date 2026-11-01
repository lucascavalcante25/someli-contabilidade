package br.com.someli.controller;

import br.com.someli.integration.IntegraContadorClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/integracoes/integra-contador")
public class IntegraContadorController {

    private final IntegraContadorClient client;

    public IntegraContadorController(IntegraContadorClient client) {
        this.client = client;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(client.status());
    }
}
