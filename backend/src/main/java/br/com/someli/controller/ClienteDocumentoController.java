package br.com.someli.controller;

import br.com.someli.domain.ClienteDocumento;
import br.com.someli.dto.ClienteDocumentoDTO;
import br.com.someli.service.ClienteDocumentoService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/clientes")
public class ClienteDocumentoController {

    private final ClienteDocumentoService documentoService;

    public ClienteDocumentoController(ClienteDocumentoService documentoService) {
        this.documentoService = documentoService;
    }

    @GetMapping("/{clienteId}/documentos")
    public ResponseEntity<List<ClienteDocumentoDTO>> listar(@PathVariable Long clienteId) {
        List<ClienteDocumentoDTO> dtos = documentoService.listarPorCliente(clienteId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/{clienteId}/documentos")
    public ResponseEntity<ClienteDocumentoDTO> upload(
            @PathVariable Long clienteId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "descricao", required = false) String descricao) throws IOException {
        ClienteDocumento doc = documentoService.upload(clienteId, file, descricao);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(doc));
    }

    @GetMapping("/{clienteId}/documentos/{id}")
    public ResponseEntity<Resource> download(
            @PathVariable Long clienteId,
            @PathVariable Long id) throws IOException {
        ClienteDocumento doc = documentoService.buscarPorId(id);
        if (!doc.getCliente().getId().equals(clienteId)) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = documentoService.obterArquivo(id);
        String filename = doc.getNomeArquivo() != null ? doc.getNomeArquivo() : "documento";
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getTipoArquivo() != null ? doc.getTipoArquivo() : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encoded)
                .body(resource);
    }

    @GetMapping("/{clienteId}/documentos/download-all")
    public ResponseEntity<byte[]> downloadAll(@PathVariable Long clienteId) throws IOException {
        byte[] zip = documentoService.obterZipTodos(clienteId);
        if (zip.length == 0) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"documentos-cliente-" + clienteId + ".zip\"")
                .body(zip);
    }

    @DeleteMapping("/{clienteId}/documentos/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long clienteId, @PathVariable Long id) throws IOException {
        ClienteDocumento doc = documentoService.buscarPorId(id);
        if (!doc.getCliente().getId().equals(clienteId)) {
            return ResponseEntity.notFound().build();
        }
        documentoService.remover(id);
        return ResponseEntity.noContent().build();
    }

    private ClienteDocumentoDTO toDto(ClienteDocumento doc) {
        ClienteDocumentoDTO dto = new ClienteDocumentoDTO();
        dto.setId(doc.getId());
        dto.setClienteId(doc.getCliente().getId());
        dto.setNomeArquivo(doc.getNomeArquivo());
        dto.setTipoArquivo(doc.getTipoArquivo());
        dto.setDataUpload(doc.getDataUpload());
        dto.setDescricao(doc.getDescricao());
        return dto;
    }
}
