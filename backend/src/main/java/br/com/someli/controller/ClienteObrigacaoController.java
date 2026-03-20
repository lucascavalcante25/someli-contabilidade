package br.com.someli.controller;

import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.dto.ClienteObrigacaoDTO;
import br.com.someli.dto.CreateClienteObrigacaoRequestDTO;
import br.com.someli.dto.UpdateClienteObrigacaoRequestDTO;
import br.com.someli.mapper.ClienteObrigacaoMapper;
import br.com.someli.service.ClienteObrigacaoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/clientes")
public class ClienteObrigacaoController {

    private final ClienteObrigacaoService clienteObrigacaoService;
    private final ClienteObrigacaoMapper clienteObrigacaoMapper;

    public ClienteObrigacaoController(ClienteObrigacaoService clienteObrigacaoService,
                                      ClienteObrigacaoMapper clienteObrigacaoMapper) {
        this.clienteObrigacaoService = clienteObrigacaoService;
        this.clienteObrigacaoMapper = clienteObrigacaoMapper;
    }

    @GetMapping("/{clienteId}/obrigacoes")
    public ResponseEntity<List<ClienteObrigacaoDTO>> listarPorCliente(
            @PathVariable Long clienteId,
            @RequestParam(required = false, defaultValue = "false") boolean incluirInativas) {
        var lista = new java.util.ArrayList<>(clienteObrigacaoService.listarPorCliente(clienteId));
        if (incluirInativas) {
            lista.addAll(clienteObrigacaoService.listarInativasPorCliente(clienteId));
        }
        List<ClienteObrigacaoDTO> dtos = lista.stream()
                .map(co -> {
                    ClienteObrigacaoDTO dto = clienteObrigacaoMapper.toDto(co);
                    dto.setStatus(calcularStatus(co));
                    return dto;
                })
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{clienteId}/obrigacoes/{id}")
    public ResponseEntity<ClienteObrigacaoDTO> buscarPorId(@PathVariable Long clienteId, @PathVariable Long id) {
        var co = clienteObrigacaoService.buscarPorId(id);
        if (!co.getCliente().getId().equals(clienteId)) {
            return ResponseEntity.notFound().build();
        }
        ClienteObrigacaoDTO dto = clienteObrigacaoMapper.toDto(co);
        dto.setStatus(calcularStatus(co));
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{clienteId}/obrigacoes")
    public ResponseEntity<ClienteObrigacaoDTO> criar(@PathVariable Long clienteId,
                                                    @Valid @RequestBody CreateClienteObrigacaoRequestDTO request) {
        request.setClienteId(clienteId);
        var co = clienteObrigacaoService.criar(request);
        ClienteObrigacaoDTO dto = clienteObrigacaoMapper.toDto(co);
        dto.setStatus(calcularStatus(co));
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/{clienteId}/obrigacoes/{id}")
    public ResponseEntity<ClienteObrigacaoDTO> atualizar(@PathVariable Long clienteId,
                                                         @PathVariable Long id,
                                                         @Valid @RequestBody UpdateClienteObrigacaoRequestDTO request) {
        var co = clienteObrigacaoService.buscarPorId(id);
        if (!co.getCliente().getId().equals(clienteId)) {
            return ResponseEntity.notFound().build();
        }
        co = clienteObrigacaoService.atualizar(id, request);
        ClienteObrigacaoDTO dto = clienteObrigacaoMapper.toDto(co);
        dto.setStatus(calcularStatus(co));
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{clienteId}/obrigacoes/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long clienteId, @PathVariable Long id) {
        var co = clienteObrigacaoService.buscarPorId(id);
        if (!co.getCliente().getId().equals(clienteId)) {
            return ResponseEntity.notFound().build();
        }
        clienteObrigacaoService.remover(id);
        return ResponseEntity.noContent().build();
    }

    private String calcularStatus(ClienteObrigacao co) {
        LocalDate hoje = LocalDate.now();
        LocalDate vencimento = co.getDataVencimento();
        int diasAntecedencia = co.getObrigacao().getDiasAntecedenciaAlerta() != null
                ? co.getObrigacao().getDiasAntecedenciaAlerta()
                : 7;
        if (vencimento.isBefore(hoje)) return "atrasado";
        if (vencimento.isEqual(hoje)) return "a_vencer";
        LocalDate limiteAlerta = hoje.plusDays(diasAntecedencia);
        if (!vencimento.isAfter(limiteAlerta)) return "proximo_vencimento";
        return "em_dia";
    }
}
