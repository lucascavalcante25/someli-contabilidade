package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteDocumento;
import br.com.someli.exception.ClienteDocumentoNaoEncontradoException;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.repository.ClienteDocumentoRepository;
import br.com.someli.repository.ClienteRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
public class ClienteDocumentoService {

    private final ClienteDocumentoRepository documentoRepository;
    private final ClienteRepository clienteRepository;
    private final Path basePath;

    public ClienteDocumentoService(ClienteDocumentoRepository documentoRepository,
                                  ClienteRepository clienteRepository,
                                  @Value("${app.upload.base-path:./data/uploads}") String basePathStr) {
        this.documentoRepository = documentoRepository;
        this.clienteRepository = clienteRepository;
        this.basePath = Paths.get(basePathStr).toAbsolutePath().normalize();
    }

    public List<ClienteDocumento> listarPorCliente(Long clienteId) {
        return documentoRepository.findByClienteIdOrderByDataUploadDesc(clienteId);
    }

    public ClienteDocumento buscarPorId(Long id) {
        return documentoRepository.findById(id)
                .orElseThrow(() -> new ClienteDocumentoNaoEncontradoException("Documento não encontrado"));
    }

    @Transactional
    public ClienteDocumento upload(Long clienteId, MultipartFile file, String descricao) throws IOException {
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado"));

        String nomeOriginal = file.getOriginalFilename() != null ? file.getOriginalFilename() : "arquivo";
        String extensao = "";
        int lastDot = nomeOriginal.lastIndexOf('.');
        if (lastDot > 0) {
            extensao = nomeOriginal.substring(lastDot);
        }
        String nomeUnico = UUID.randomUUID().toString().replace("-", "") + extensao;
        Path clienteDir = basePath.resolve("clientes").resolve(clienteId.toString());
        Files.createDirectories(clienteDir);
        Path targetPath = clienteDir.resolve(nomeUnico);

        try (InputStream is = file.getInputStream()) {
            Files.copy(is, targetPath, StandardCopyOption.REPLACE_EXISTING);
        }

        String tipoArquivo = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        String urlRelativa = "clientes/" + clienteId + "/" + nomeUnico;

        ClienteDocumento doc = new ClienteDocumento();
        doc.setCliente(cliente);
        doc.setNomeArquivo(nomeOriginal);
        doc.setTipoArquivo(tipoArquivo);
        doc.setUrlArquivo(urlRelativa);
        doc.setDescricao(descricao != null && !descricao.isBlank() ? descricao.trim() : null);
        return documentoRepository.save(doc);
    }

    public Resource obterArquivo(Long documentoId) throws MalformedURLException {
        ClienteDocumento doc = buscarPorId(documentoId);
        Path filePath = basePath.resolve(doc.getUrlArquivo()).normalize();
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            throw new ClienteDocumentoNaoEncontradoException("Arquivo não encontrado ou não legível");
        }
        return resource;
    }

    public byte[] obterZipTodos(Long clienteId) throws IOException {
        List<ClienteDocumento> docs = listarPorCliente(clienteId);
        if (docs.isEmpty()) {
            return new byte[0];
        }
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(baos)) {
            java.util.Set<String> usedNames = new java.util.HashSet<>();
            for (ClienteDocumento doc : docs) {
                Path filePath = basePath.resolve(doc.getUrlArquivo()).normalize();
                if (Files.exists(filePath)) {
                    String baseName = doc.getNomeArquivo() != null ? doc.getNomeArquivo() : "doc_" + doc.getId();
                    String entryName = uniqueZipEntryName(baseName, usedNames);
                    zos.putNextEntry(new java.util.zip.ZipEntry(entryName));
                    Files.copy(filePath, zos);
                    zos.closeEntry();
                }
            }
        }
        return baos.toByteArray();
    }

    private String uniqueZipEntryName(String name, java.util.Set<String> used) {
        String safe = name.replace("..", "").replaceAll("[\\\\/]", "_");
        if (used.add(safe)) return safe;
        int i = 1;
        int dot = safe.lastIndexOf('.');
        String base = dot > 0 ? safe.substring(0, dot) : safe;
        String ext = dot > 0 ? safe.substring(dot) : "";
        while (!used.add(base + " (" + i + ")" + ext)) i++;
        return base + " (" + i + ")" + ext;
    }

    @Transactional
    public void remover(Long documentoId) throws IOException {
        ClienteDocumento doc = buscarPorId(documentoId);
        Path filePath = basePath.resolve(doc.getUrlArquivo()).normalize();
        documentoRepository.delete(doc);
        if (Files.exists(filePath)) {
            Files.delete(filePath);
        }
    }
}
