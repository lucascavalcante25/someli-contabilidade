package br.com.someli.controller;

import br.com.someli.dto.MensagemDiariaDTO;
import br.com.someli.service.MensagemDiariaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mensagens-diarias")
public class MensagemDiariaController {

    private final MensagemDiariaService mensagemDiariaService;

    public MensagemDiariaController(MensagemDiariaService mensagemDiariaService) {
        this.mensagemDiariaService = mensagemDiariaService;
    }

    @GetMapping("/hoje")
    public ResponseEntity<MensagemDiariaDTO> hoje() {
        return ResponseEntity.ok(mensagemDiariaService.obterDeHoje());
    }
}
