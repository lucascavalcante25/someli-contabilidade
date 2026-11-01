package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteDocumento;
import br.com.someli.domain.NotaFiscalImport;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.NotaFiscalImportDTO;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.integration.XmlNotaFiscalParser;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.NotaFiscalImportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class NotaFiscalImportService {

    private final NotaFiscalImportRepository repository;
    private final ClienteRepository clienteRepository;
    private final ClienteDocumentoService documentoService;
    private final AuthorizationService authorizationService;

    public NotaFiscalImportService(NotaFiscalImportRepository repository,
                                   ClienteRepository clienteRepository,
                                   ClienteDocumentoService documentoService,
                                   AuthorizationService authorizationService) {
        this.repository = repository;
        this.clienteRepository = clienteRepository;
        this.documentoService = documentoService;
        this.authorizationService = authorizationService;
    }

    @Transactional(readOnly = true)
    public List<NotaFiscalImportDTO> listarPorCliente(Long clienteId, String competencia) {
        authorizationService.requireCompanyAccess(clienteId);
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        List<NotaFiscalImport> lista = (competencia != null && !competencia.isBlank())
                ? repository.findByClienteIdAndCompetenciaOrderByDataEmissaoDesc(clienteId, competencia)
                : repository.findByClienteIdOrderByDataEmissaoDescCreatedAtDesc(clienteId);
        return lista.stream().map(this::toDto).toList();
    }

    @Transactional
    public List<NotaFiscalImportDTO> importarLote(Long clienteIdHint, MultipartFile[] files, String competenciaHint)
            throws IOException {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        if (files == null || files.length == 0) {
            throw new RegraNegocioException("Envie ao menos um arquivo XML");
        }
        if (clienteIdHint != null) {
            authorizationService.requireCompanyAccess(clienteIdHint);
        }
        List<NotaFiscalImportDTO> out = new ArrayList<>();
        for (MultipartFile file : files) {
            out.add(importarUm(clienteIdHint, file, competenciaHint));
        }
        return out;
    }

    @Transactional
    public NotaFiscalImportDTO importarUm(Long clienteIdHint, MultipartFile file, String competenciaHint)
            throws IOException {
        byte[] bytes = file.getBytes();
        XmlNotaFiscalParser.Resultado parsed = XmlNotaFiscalParser.parse(bytes);

        NotaFiscalImport entity = new NotaFiscalImport();
        entity.setTipo(parsed.tipo != null ? parsed.tipo : "DESCONHECIDO");
        entity.setNomeArquivo(file.getOriginalFilename());
        entity.setChaveAcesso(blankToNull(parsed.chaveAcesso));
        entity.setNumero(parsed.numero);
        entity.setSerie(parsed.serie);
        entity.setCnpjEmitente(parsed.cnpjEmitente);
        entity.setCnpjDestinatario(parsed.cnpjDestinatario);
        entity.setDataEmissao(parsed.dataEmissao);
        entity.setValorTotal(parsed.valorTotal);
        entity.setStatusParse(parsed.ok ? "OK" : "ERRO");
        entity.setMensagemErro(parsed.mensagemErro);

        String competencia = competenciaHint;
        if (competencia == null || competencia.isBlank()) {
            competencia = XmlNotaFiscalParser.competenciaDe(parsed.dataEmissao).orElse(null);
        }
        entity.setCompetencia(competencia);

        Cliente cliente = resolverCliente(clienteIdHint, parsed.cnpjEmitente, parsed.cnpjDestinatario);
        if (cliente != null) {
            authorizationService.requireCompanyAccess(cliente.getId());
            entity.setCliente(cliente);
            // Persiste XML como documento do cliente+competência
            ClienteDocumento doc = documentoService.uploadXml(
                    cliente.getId(), file, competencia, "FISCAL", "XML_NFE");
            entity.setDocumento(doc);
        } else if (!parsed.ok) {
            // sem cliente e parse falhou — ainda registra para auditoria se houver hint
            if (clienteIdHint != null) {
                Cliente c = clienteRepository.findById(clienteIdHint).orElse(null);
                entity.setCliente(c);
            }
        } else if (clienteIdHint != null) {
            Cliente c = clienteRepository.findById(clienteIdHint)
                    .orElseThrow(() -> new RegraNegocioException("Cliente não encontrado"));
            entity.setCliente(c);
            ClienteDocumento doc = documentoService.uploadXml(
                    c.getId(), file, competencia, "FISCAL", "XML_NFE");
            entity.setDocumento(doc);
        }

        if (entity.getChaveAcesso() != null && repository.existsByChaveAcesso(entity.getChaveAcesso())) {
            NotaFiscalImport existente = repository.findByChaveAcesso(entity.getChaveAcesso()).orElseThrow();
            existente.setStatusParse("DUPLICADO");
            existente.setMensagemErro("XML já importado anteriormente");
            return toDto(existente);
        }

        return toDto(repository.save(entity));
    }

    private Cliente resolverCliente(Long hint, String cnpjEmit, String cnpjDest) {
        if (hint != null) {
            return clienteRepository.findById(hint).orElse(null);
        }
        Optional<Cliente> byEmit = cnpjEmit != null ? clienteRepository.findByCnpj(cnpjEmit) : Optional.empty();
        if (byEmit.isPresent()) return byEmit.get();
        return cnpjDest != null ? clienteRepository.findByCnpj(cnpjDest).orElse(null) : null;
    }

    private String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    private NotaFiscalImportDTO toDto(NotaFiscalImport n) {
        NotaFiscalImportDTO dto = new NotaFiscalImportDTO();
        dto.setId(n.getId());
        if (n.getCliente() != null) dto.setClienteId(n.getCliente().getId());
        if (n.getDocumento() != null) dto.setDocumentoId(n.getDocumento().getId());
        dto.setTipo(n.getTipo());
        dto.setChaveAcesso(n.getChaveAcesso());
        dto.setNumero(n.getNumero());
        dto.setSerie(n.getSerie());
        dto.setCnpjEmitente(n.getCnpjEmitente());
        dto.setCnpjDestinatario(n.getCnpjDestinatario());
        dto.setDataEmissao(n.getDataEmissao());
        dto.setValorTotal(n.getValorTotal());
        dto.setCompetencia(n.getCompetencia());
        dto.setNomeArquivo(n.getNomeArquivo());
        dto.setStatusParse(n.getStatusParse());
        dto.setMensagemErro(n.getMensagemErro());
        dto.setCreatedAt(n.getCreatedAt());
        return dto;
    }
}
