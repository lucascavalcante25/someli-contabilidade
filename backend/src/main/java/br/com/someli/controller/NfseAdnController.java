package br.com.someli.controller;

import br.com.someli.dto.NfseAdnStatusDTO;
import br.com.someli.service.NfseAdnService;
import br.com.someli.service.NfseAdnSyncService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/** Busca automática de NFS-e no Portal Nacional (ADN). Autorização no NfseAdnService. */
@RestController
public class NfseAdnController {

    public record AlterarAtivoRequest(@NotNull Boolean ativo) {
    }

    private final NfseAdnService service;

    public NfseAdnController(NfseAdnService service) {
        this.service = service;
    }

    @GetMapping("/clientes/{clienteId}/nfse-adn")
    public ResponseEntity<NfseAdnStatusDTO> status(@PathVariable Long clienteId) {
        return ResponseEntity.ok(service.status(clienteId));
    }

    @PostMapping("/clientes/{clienteId}/nfse-adn/certificado")
    public ResponseEntity<NfseAdnStatusDTO> enviarCertificado(@PathVariable Long clienteId,
                                                              @RequestPart("arquivo") MultipartFile arquivo,
                                                              @RequestParam("senha") String senha) throws IOException {
        return ResponseEntity.ok(service.salvarCertificado(clienteId, arquivo, senha));
    }

    @DeleteMapping("/clientes/{clienteId}/nfse-adn/certificado")
    public ResponseEntity<NfseAdnStatusDTO> removerCertificado(@PathVariable Long clienteId) {
        return ResponseEntity.ok(service.removerCertificado(clienteId));
    }

    @PutMapping("/clientes/{clienteId}/nfse-adn/ativo")
    public ResponseEntity<NfseAdnStatusDTO> alterarAtivo(@PathVariable Long clienteId,
                                                         @Valid @RequestBody AlterarAtivoRequest request) {
        return ResponseEntity.ok(service.alterarAtivo(clienteId, request.ativo()));
    }

    @PostMapping("/clientes/{clienteId}/nfse-adn/sincronizar")
    public ResponseEntity<NfseAdnSyncService.Resultado> sincronizar(@PathVariable Long clienteId) {
        return ResponseEntity.ok(service.sincronizarAgora(clienteId));
    }
}
