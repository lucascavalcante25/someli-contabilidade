package br.com.someli.controller;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.ClienteObrigacaoDTO;
import br.com.someli.dto.ObrigacoesDashboardDTO;
import br.com.someli.mapper.ClienteObrigacaoMapper;
import br.com.someli.service.AuthorizationService;
import br.com.someli.service.ClienteObrigacaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/obrigacoes/dashboard")
public class ObrigacoesDashboardController {

    private final ClienteObrigacaoService clienteObrigacaoService;
    private final ClienteObrigacaoMapper clienteObrigacaoMapper;
    private final AuthorizationService authorizationService;

    public ObrigacoesDashboardController(ClienteObrigacaoService clienteObrigacaoService,
                                         ClienteObrigacaoMapper clienteObrigacaoMapper,
                                         AuthorizationService authorizationService) {
        this.clienteObrigacaoService = clienteObrigacaoService;
        this.clienteObrigacaoMapper = clienteObrigacaoMapper;
        this.authorizationService = authorizationService;
    }

    @GetMapping
    public ResponseEntity<ObrigacoesDashboardDTO> obterResumo(
            @RequestParam(defaultValue = "7") int diasEmBreve) {
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_VISUALIZAR);
        List<Long> alcada = authorizationService.clienteIdsNaAlcadaAtual();
        Set<Long> ids = alcada == null ? null : new HashSet<>(alcada);

        List<ClienteObrigacaoDTO> vencendoHoje = clienteObrigacaoService.listarVencendoHoje().stream()
                .filter(co -> ids == null || ids.contains(co.getCliente().getId()))
                .map(co -> {
                    ClienteObrigacaoDTO dto = clienteObrigacaoMapper.toDto(co);
                    dto.setStatus("a_vencer");
                    return dto;
                })
                .toList();

        List<ClienteObrigacaoDTO> vencendoEmBreve = clienteObrigacaoService.listarVencendoEmBreve(diasEmBreve).stream()
                .filter(co -> ids == null || ids.contains(co.getCliente().getId()))
                .map(co -> {
                    ClienteObrigacaoDTO dto = clienteObrigacaoMapper.toDto(co);
                    dto.setStatus("em_dia");
                    return dto;
                })
                .toList();

        List<ClienteObrigacaoDTO> atrasadas = clienteObrigacaoService.listarAtrasadas().stream()
                .filter(co -> ids == null || ids.contains(co.getCliente().getId()))
                .map(co -> {
                    ClienteObrigacaoDTO dto = clienteObrigacaoMapper.toDto(co);
                    dto.setStatus("atrasado");
                    return dto;
                })
                .toList();

        return ResponseEntity.ok(new ObrigacoesDashboardDTO(vencendoHoje, vencendoEmBreve, atrasadas));
    }
}
