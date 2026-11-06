package br.com.someli.controller;

import br.com.someli.dto.CarteiraSetorDTO;
import br.com.someli.service.UsuarioCarteiraService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Carteira de clientes do usuário e transferência quando ele sai. Permissões checadas no service. */
@RestController
@RequestMapping("/usuarios/{id}/carteira")
public class UsuarioCarteiraController {

    private final UsuarioCarteiraService service;

    public UsuarioCarteiraController(UsuarioCarteiraService service) {
        this.service = service;
    }

    public record TransferirCarteiraRequest(@NotNull Map<String, Long> destinos) {
    }

    @GetMapping
    public ResponseEntity<List<CarteiraSetorDTO>> carteira(@PathVariable Long id) {
        return ResponseEntity.ok(service.carteira(id));
    }

    @PostMapping("/transferir")
    public ResponseEntity<Map<String, Integer>> transferir(@PathVariable Long id,
                                                          @Valid @RequestBody TransferirCarteiraRequest request) {
        return ResponseEntity.ok(Map.of("transferidos", service.transferir(id, request.destinos())));
    }
}
