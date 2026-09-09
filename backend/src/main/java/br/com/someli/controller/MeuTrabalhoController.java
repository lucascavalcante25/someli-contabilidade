package br.com.someli.controller;

import br.com.someli.dto.MeuTrabalhoDTO;
import br.com.someli.service.MeuTrabalhoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/meu-trabalho")
public class MeuTrabalhoController {

    private final MeuTrabalhoService meuTrabalhoService;

    public MeuTrabalhoController(MeuTrabalhoService meuTrabalhoService) {
        this.meuTrabalhoService = meuTrabalhoService;
    }

    @GetMapping
    public ResponseEntity<MeuTrabalhoDTO> obter() {
        return ResponseEntity.ok(meuTrabalhoService.obter());
    }
}
