package br.com.someli.controller;

import br.com.someli.dto.ClienteDTO;
import br.com.someli.dto.ClienteResponsavelDTO;
import br.com.someli.dto.CreateClienteRequestDTO;
import br.com.someli.dto.UpdateClienteRequestDTO;
import br.com.someli.dto.UpsertClienteResponsavelRequestDTO;
import br.com.someli.mapper.ClienteMapper;
import br.com.someli.service.AuthorizationService;
import br.com.someli.service.ClienteResponsavelService;
import br.com.someli.service.ClienteService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/clientes")
public class ClienteController {

    private final ClienteService clienteService;
    private final ClienteMapper clienteMapper;
    private final AuthorizationService authorizationService;
    private final ClienteResponsavelService clienteResponsavelService;

    public ClienteController(ClienteService clienteService,
                             ClienteMapper clienteMapper,
                             AuthorizationService authorizationService,
                             ClienteResponsavelService clienteResponsavelService) {
        this.clienteService = clienteService;
        this.clienteMapper = clienteMapper;
        this.authorizationService = authorizationService;
        this.clienteResponsavelService = clienteResponsavelService;
    }

    @GetMapping
    public ResponseEntity<List<ClienteDTO>> listarTodos() {
        boolean podeHonorario = authorizationService.canViewHonorario();
        List<ClienteDTO> clientes = clienteService.listarTodos()
                .stream()
                .map(c -> sanitizarFinanceiro(clienteMapper.toDto(c), podeHonorario))
                .toList();
        return ResponseEntity.ok(clientes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClienteDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(sanitizarFinanceiro(
                clienteMapper.toDto(clienteService.buscarPorId(id)),
                authorizationService.canViewHonorario()));
    }

    @PostMapping
    public ResponseEntity<ClienteDTO> criar(@Valid @RequestBody CreateClienteRequestDTO request) {
        ClienteDTO cliente = sanitizarFinanceiro(
                clienteMapper.toDto(clienteService.criar(request)),
                authorizationService.canViewHonorario());
        return ResponseEntity.status(HttpStatus.CREATED).body(cliente);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClienteDTO> atualizar(@PathVariable Long id, @Valid @RequestBody UpdateClienteRequestDTO request) {
        ClienteDTO cliente = sanitizarFinanceiro(
                clienteMapper.toDto(clienteService.atualizar(id, request)),
                authorizationService.canViewHonorario());
        return ResponseEntity.ok(cliente);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        clienteService.remover(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/responsaveis")
    public ResponseEntity<List<ClienteResponsavelDTO>> listarResponsaveis(@PathVariable Long id) {
        return ResponseEntity.ok(clienteResponsavelService.resumoPorCliente(id));
    }

    @PutMapping("/{id}/responsaveis")
    public ResponseEntity<ClienteResponsavelDTO> definirResponsavel(
            @PathVariable Long id,
            @RequestBody UpsertClienteResponsavelRequestDTO request) {
        return ResponseEntity.ok(clienteResponsavelService.definir(id, request));
    }

    private ClienteDTO sanitizarFinanceiro(ClienteDTO dto, boolean podeHonorario) {
        if (!podeHonorario) {
            dto.setHonorario(null);
            dto.setValorPendente(null);
            dto.setMesesPendentes(null);
            dto.setMesesPendentesDetalhe(null);
        }
        return dto;
    }
}
