package br.com.someli.controller;

import br.com.someli.dto.ClienteObrigacaoDTO;
import br.com.someli.dto.ObrigacoesDashboardDTO;
import br.com.someli.mapper.ClienteObrigacaoMapper;
import br.com.someli.service.ClienteObrigacaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/obrigacoes/dashboard")
public class ObrigacoesDashboardController {

    private final ClienteObrigacaoService clienteObrigacaoService;
    private final ClienteObrigacaoMapper clienteObrigacaoMapper;

    public ObrigacoesDashboardController(ClienteObrigacaoService clienteObrigacaoService,
                                         ClienteObrigacaoMapper clienteObrigacaoMapper) {
        this.clienteObrigacaoService = clienteObrigacaoService;
        this.clienteObrigacaoMapper = clienteObrigacaoMapper;
    }

    @GetMapping
    public ResponseEntity<ObrigacoesDashboardDTO> obterResumo(
            @RequestParam(defaultValue = "7") int diasEmBreve) {
        List<ClienteObrigacaoDTO> vencendoHoje = clienteObrigacaoService.listarVencendoHoje().stream()
                .map(co -> {
                    ClienteObrigacaoDTO dto = clienteObrigacaoMapper.toDto(co);
                    dto.setStatus("a_vencer");
                    return dto;
                })
                .toList();

        List<ClienteObrigacaoDTO> vencendoEmBreve = clienteObrigacaoService.listarVencendoEmBreve(diasEmBreve).stream()
                .map(co -> {
                    ClienteObrigacaoDTO dto = clienteObrigacaoMapper.toDto(co);
                    dto.setStatus("em_dia");
                    return dto;
                })
                .toList();

        List<ClienteObrigacaoDTO> atrasadas = clienteObrigacaoService.listarAtrasadas().stream()
                .map(co -> {
                    ClienteObrigacaoDTO dto = clienteObrigacaoMapper.toDto(co);
                    dto.setStatus("atrasado");
                    return dto;
                })
                .toList();

        return ResponseEntity.ok(new ObrigacoesDashboardDTO(vencendoHoje, vencendoEmBreve, atrasadas));
    }
}
