package br.com.someli.controller;

import br.com.someli.dto.DataEspecialDTO;
import br.com.someli.service.DatasEspeciaisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Calendário do Dashboard: aniversários e dias de profissão dos clientes no mês. Permissão e alçada no service. */
@RestController
@RequestMapping("/datas-especiais")
public class DatasEspeciaisController {

    private final DatasEspeciaisService service;

    public DatasEspeciaisController(DatasEspeciaisService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<DataEspecialDTO>> doMes(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(service.eventosDoMes(ano, mes));
    }
}
