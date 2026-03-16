package br.com.someli.controller;

import br.com.someli.dto.SintegraDTO;
import br.com.someli.dto.SintegraRequestDTO;
import br.com.someli.service.SintegraService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SintegraController {

    private final SintegraService sintegraService;

    public SintegraController(SintegraService sintegraService) {
        this.sintegraService = sintegraService;
    }

    @PostMapping("/someli/api/sintegra/consulta")
    public ResponseEntity<SintegraDTO> consultar(@RequestBody SintegraRequestDTO request) {
        if (request.getCnpj() != null) {
            request.setCnpj(request.getCnpj().replaceAll("\\D", ""));
        }
        return ResponseEntity.ok(sintegraService.consultarSintegra(request));
    }
}
