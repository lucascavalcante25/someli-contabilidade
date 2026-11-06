package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteDocumento;
import br.com.someli.exception.ClienteDocumentoNaoEncontradoException;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteDocumentoRepository;
import br.com.someli.repository.ClienteRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.InputStreamSource;
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
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class ClienteDocumentoService {

    /**
     * Únicos tipos aceitos (envio interno e pelo link). O tipo gravado vem daqui, nunca do navegador:
     * assim nada vira HTML/script ao ser aberto na pré-visualização.
     */
    private static final Map<String, String> TIPOS_PERMITIDOS = Map.ofEntries(
            Map.entry(".pdf", "application/pdf"),
            Map.entry(".jpg", "image/jpeg"),
            Map.entry(".jpeg", "image/jpeg"),
            Map.entry(".png", "image/png"),
            Map.entry(".webp", "image/webp"),
            Map.entry(".xml", "application/xml"),
            Map.entry(".csv", "text/csv"),
            Map.entry(".txt", "text/plain"),
            Map.entry(".ofx", "application/x-ofx"),
            Map.entry(".xls", "application/vnd.ms-excel"),
            Map.entry(".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.entry(".ods", "application/vnd.oasis.opendocument.spreadsheet"),
            Map.entry(".doc", "application/msword"),
            Map.entry(".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry(".odt", "application/vnd.oasis.opendocument.text"),
            Map.entry(".zip", "application/zip"));

    static final String MENSAGEM_TIPO_RECUSADO =
            "Tipo não permitido. Envie PDF, imagem, planilha (XLS, XLSX, ODS, CSV), documento (DOC, DOCX, ODT), "
                    + "extrato (OFX, TXT), XML ou ZIP";

    private final ClienteDocumentoRepository documentoRepository;
    private final ClienteRepository clienteRepository;
    private final AuthorizationService authorizationService;
    private final Path basePath;

    public ClienteDocumentoService(ClienteDocumentoRepository documentoRepository,
                                  ClienteRepository clienteRepository,
                                  AuthorizationService authorizationService,
                                  @Value("${app.upload.base-path:./data/uploads}") String basePathStr) {
        this.documentoRepository = documentoRepository;
        this.clienteRepository = clienteRepository;
        this.authorizationService = authorizationService;
        this.basePath = Paths.get(basePathStr).toAbsolutePath().normalize();
    }

    public List<ClienteDocumento> listarPorCliente(Long clienteId) {
        authorizationService.requireCompanyAccess(clienteId);
        return documentoRepository.findByClienteIdOrderByDataUploadDesc(clienteId);
    }

    public List<ClienteDocumento> listarPorClienteECompetencia(Long clienteId, String competencia) {
        authorizationService.requireCompanyAccess(clienteId);
        if (competencia == null || competencia.isBlank()) {
            return listarPorCliente(clienteId);
        }
        if (!competencia.matches("\\d{4}-\\d{2}")) {
            throw new RegraNegocioException("Competência deve estar no formato YYYY-MM");
        }
        return documentoRepository.findByClienteIdAndCompetenciaOrderByDataUploadDesc(clienteId, competencia);
    }

    public ClienteDocumento buscarPorId(Long id) {
        return documentoRepository.findById(id)
                .orElseThrow(() -> new ClienteDocumentoNaoEncontradoException("Documento não encontrado"));
    }

    @Transactional
    public ClienteDocumento upload(Long clienteId, MultipartFile file, String descricao) throws IOException {
        return upload(clienteId, file, descricao, null, null, "GERAL", "INTERNO", false);
    }

    @Transactional
    public ClienteDocumento upload(Long clienteId,
                                   MultipartFile file,
                                   String descricao,
                                   String competencia,
                                   String setor,
                                   String categoria,
                                   String origem,
                                   boolean compartilhadoComCliente) throws IOException {
        authorizationService.requireCompanyAccess(clienteId);
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado"));

        if (competencia != null && !competencia.isBlank() && !competencia.matches("\\d{4}-\\d{2}")) {
            throw new RegraNegocioException("Competência deve estar no formato YYYY-MM");
        }

        String tipoArquivo = tipoPermitido(file.getOriginalFilename());
        if (tipoArquivo == null) {
            throw new RegraNegocioException(MENSAGEM_TIPO_RECUSADO);
        }
        return gravar(cliente, file, nomeSeguro(file.getOriginalFilename()), tipoArquivo, descricao, competencia,
                setor, categoria, origem, compartilhadoComCliente);
    }

    /** Tipo real a partir da extensão, ou null se ela não é aceita. */
    public static String tipoPermitido(String nomeArquivo) {
        if (nomeArquivo == null) {
            return null;
        }
        int ponto = nomeArquivo.lastIndexOf('.');
        return ponto < 0 ? null : TIPOS_PERMITIDOS.get(nomeArquivo.substring(ponto).toLowerCase(Locale.ROOT));
    }

    /** Nome original sem pasta nem caracteres perigosos (vai para o cabeçalho do download). */
    public static String nomeSeguro(String nomeOriginal) {
        String nome = nomeOriginal == null ? "arquivo" : nomeOriginal;
        String seguro = nome.replaceAll(".*[\\\\/]", "").replaceAll("[^\\p{L}\\p{N} ._()-]", "_");
        if (seguro.isBlank()) {
            seguro = "arquivo";
        }
        return seguro.length() > 150 ? seguro.substring(seguro.length() - 150) : seguro;
    }

    /** Envio do cliente pelo link: a autorização é o token validado em SolicitacaoDocumentoService. */
    public ClienteDocumento salvarRecebidoPorLink(Cliente cliente, MultipartFile file, String descricao,
                                                  String competencia) throws IOException {
        String tipo = tipoPermitido(file.getOriginalFilename());
        if (tipo == null) {
            throw new RegraNegocioException(MENSAGEM_TIPO_RECUSADO);
        }
        return gravar(cliente, file, nomeSeguro(file.getOriginalFilename()), tipo, descricao, competencia, null,
                "GERAL", "CLIENTE_LINK", false);
    }

    /**
     * XML baixado pelo sistema (job do ADN, sem usuário logado). Quem chama já autorizou o cliente.
     * O nome é montado pelo próprio sistema (chave numérica), nunca vem de fora.
     */
    public ClienteDocumento salvarXmlSistema(Cliente cliente, byte[] xml, String nomeArquivo, String competencia,
                                             String origem) throws IOException {
        if (!nomeArquivo.matches("[A-Za-z0-9_.-]{1,120}")) {
            throw new RegraNegocioException("Nome de arquivo inválido");
        }
        return gravar(cliente, new ByteArrayResource(xml), nomeArquivo, "application/xml",
                "NFS-e baixada do Portal Nacional", competencia, "FISCAL", "XML_NFSE", origem, false);
    }

    private ClienteDocumento gravar(Cliente cliente, InputStreamSource file, String nomeOriginal, String tipoArquivo,
                                    String descricao, String competencia, String setor, String categoria,
                                    String origem, boolean compartilhadoComCliente) throws IOException {
        Long clienteId = cliente.getId();
        String extensao = "";
        int lastDot = nomeOriginal.lastIndexOf('.');
        if (lastDot > 0) {
            extensao = nomeOriginal.substring(lastDot);
        }
        String nomeUnico = UUID.randomUUID().toString().replace("-", "") + extensao;
        Path clienteDir = basePath.resolve("clientes").resolve(clienteId.toString());
        if (competencia != null && !competencia.isBlank()) {
            clienteDir = clienteDir.resolve(competencia);
        }
        Files.createDirectories(clienteDir);
        Path targetPath = clienteDir.resolve(nomeUnico);

        try (InputStream is = file.getInputStream()) {
            Files.copy(is, targetPath, StandardCopyOption.REPLACE_EXISTING);
        }

        String urlRelativa = basePath.relativize(targetPath).toString().replace('\\', '/');

        ClienteDocumento doc = new ClienteDocumento();
        doc.setCliente(cliente);
        doc.setNomeArquivo(nomeOriginal);
        doc.setTipoArquivo(tipoArquivo);
        doc.setUrlArquivo(urlRelativa);
        doc.setDescricao(descricao != null && !descricao.isBlank() ? descricao.trim() : null);
        doc.setCompetencia(competencia != null && !competencia.isBlank() ? competencia : null);
        doc.setSetor(setor);
        doc.setCategoria(categoria != null ? categoria : "GERAL");
        doc.setOrigem(origem != null ? origem : "INTERNO");
        doc.setCompartilhadoComCliente(compartilhadoComCliente);
        return documentoRepository.save(doc);
    }

    @Transactional
    public ClienteDocumento uploadXml(Long clienteId, MultipartFile file, String competencia,
                                      String setor, String categoria) throws IOException {
        return upload(clienteId, file, "Import XML NFe/NFSe", competencia, setor, categoria, "XML_IMPORT", false);
    }

    public Resource obterArquivo(Long documentoId) throws MalformedURLException {
        ClienteDocumento doc = buscarPorId(documentoId);
        authorizationService.requireCompanyAccess(doc.getCliente().getId());
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
                    if (doc.getCompetencia() != null) {
                        baseName = doc.getCompetencia() + "/" + baseName;
                    }
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
        String safe = name.replace("..", "").replaceAll("[\\\\]", "/");
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
        authorizationService.requireCompanyAccess(doc.getCliente().getId());
        Path filePath = basePath.resolve(doc.getUrlArquivo()).normalize();
        documentoRepository.delete(doc);
        if (Files.exists(filePath)) {
            Files.delete(filePath);
        }
    }
}
