package br.com.someli.controller;

import br.com.someli.dto.ClienteAcessoAtualizarRequest;
import br.com.someli.dto.ClienteAcessoCriarRequest;
import br.com.someli.dto.ClienteAcessoResumoDTO;
import br.com.someli.dto.ClienteAcessoReveladoDTO;
import br.com.someli.dto.ClienteAnotacaoDTO;
import br.com.someli.dto.ClienteAnotacaoSalvarRequest;
import br.com.someli.dto.FichaContagemDTO;
import br.com.someli.dto.Gravacao;
import br.com.someli.service.ClienteAcessoService;
import br.com.someli.service.ClienteAnotacaoService;
import br.com.someli.service.FichaContagemService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class FichaClienteController {

    private final ClienteAcessoService acessoService;
    private final ClienteAnotacaoService anotacaoService;
    private final FichaContagemService contagemService;

    public FichaClienteController(ClienteAcessoService acessoService,
                                  ClienteAnotacaoService anotacaoService,
                                  FichaContagemService contagemService) {
        this.acessoService = acessoService;
        this.anotacaoService = anotacaoService;
        this.contagemService = contagemService;
    }

    @GetMapping("/clientes/fichas/contagens")
    public List<FichaContagemDTO> contagens() {
        return contagemService.contagens();
    }

    @GetMapping("/clientes/{clienteId}/acessos")
    public List<ClienteAcessoResumoDTO> listarAcessos(@PathVariable Long clienteId) {
        return acessoService.listar(clienteId);
    }

    @PostMapping("/clientes/{clienteId}/acessos")
    public ResponseEntity<ClienteAcessoResumoDTO> criarAcesso(@PathVariable Long clienteId,
                                                              @Valid @RequestBody ClienteAcessoCriarRequest request) {
        Gravacao<ClienteAcessoResumoDTO> gravacao = acessoService.criar(clienteId, request);
        HttpStatus status = gravacao.criado() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(gravacao.corpo());
    }

    @PutMapping("/acessos/{id}")
    public ClienteAcessoResumoDTO atualizarAcesso(@PathVariable Long id,
                                                  @Valid @RequestBody ClienteAcessoAtualizarRequest request) {
        return acessoService.atualizar(id, request);
    }

    @DeleteMapping("/acessos/{id}")
    public ResponseEntity<Void> desativarAcesso(@PathVariable Long id) {
        acessoService.desativar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/acessos/{id}/revelar")
    public ResponseEntity<ClienteAcessoReveladoDTO> revelar(@PathVariable Long id) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(acessoService.revelar(id));
    }

    @GetMapping("/clientes/{clienteId}/anotacoes")
    public List<ClienteAnotacaoDTO> listarAnotacoes(@PathVariable Long clienteId) {
        return anotacaoService.listar(clienteId);
    }

    @PostMapping("/clientes/{clienteId}/anotacoes")
    public ResponseEntity<ClienteAnotacaoDTO> criarAnotacao(@PathVariable Long clienteId,
                                                            @Valid @RequestBody ClienteAnotacaoSalvarRequest request) {
        Gravacao<ClienteAnotacaoDTO> gravacao = anotacaoService.criar(clienteId, request);
        HttpStatus status = gravacao.criado() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(gravacao.corpo());
    }

    @PutMapping("/anotacoes/{id}")
    public ClienteAnotacaoDTO atualizarAnotacao(@PathVariable Long id,
                                                @Valid @RequestBody ClienteAnotacaoSalvarRequest request) {
        return anotacaoService.atualizar(id, request);
    }

    @DeleteMapping("/anotacoes/{id}")
    public ResponseEntity<Void> desativarAnotacao(@PathVariable Long id) {
        anotacaoService.desativar(id);
        return ResponseEntity.noContent().build();
    }
}
