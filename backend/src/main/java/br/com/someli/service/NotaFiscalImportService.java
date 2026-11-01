package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteDocumento;
import br.com.someli.domain.NotaFiscalImport;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.NotaFiscalImportDTO;
import br.com.someli.dto.RadarFiscalCompetenciaDTO;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.integration.XmlNotaFiscalParser;
import br.com.someli.repository.ClienteDocumentoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.NotaFiscalImportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class NotaFiscalImportService {

    private final NotaFiscalImportRepository repository;
    private final ClienteRepository clienteRepository;
    private final ClienteDocumentoRepository documentoRepository;
    private final ClienteDocumentoService documentoService;
    private final AuthorizationService authorizationService;

    public NotaFiscalImportService(NotaFiscalImportRepository repository,
                                   ClienteRepository clienteRepository,
                                   ClienteDocumentoRepository documentoRepository,
                                   ClienteDocumentoService documentoService,
                                   AuthorizationService authorizationService) {
        this.repository = repository;
        this.clienteRepository = clienteRepository;
        this.documentoRepository = documentoRepository;
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

    /**
     * Radar fiscal leve: agrega XMLs importados por competência (entrada × saída pelo CNPJ do cliente).
     * Também sinaliza competências recentes com docs fiscais mas sem XML.
     */
    @Transactional(readOnly = true)
    public List<RadarFiscalCompetenciaDTO> radarPorCliente(Long clienteId) {
        authorizationService.requireCompanyAccess(clienteId);
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new RegraNegocioException("Cliente não encontrado"));
        String cnpjCliente = cliente.getCnpj() != null ? cliente.getCnpj().replaceAll("\\D", "") : null;

        List<NotaFiscalImport> notas = repository.findByClienteIdOrderByDataEmissaoDescCreatedAtDesc(clienteId);
        Map<String, List<NotaFiscalImport>> porComp = notas.stream()
                .filter(n -> n.getCompetencia() != null && !n.getCompetencia().isBlank())
                .collect(Collectors.groupingBy(NotaFiscalImport::getCompetencia, LinkedHashMap::new, Collectors.toList()));

        Set<String> compsComDocFiscal = documentoRepository.findByClienteIdOrderByDataUploadDesc(clienteId).stream()
                .filter(d -> d.getCompetencia() != null && !d.getCompetencia().isBlank())
                .filter(d -> {
                    String cat = d.getCategoria() != null ? d.getCategoria().toUpperCase() : "";
                    String tipo = d.getTipoArquivo() != null ? d.getTipoArquivo().toUpperCase() : "";
                    String nome = d.getNomeArquivo() != null ? d.getNomeArquivo().toUpperCase() : "";
                    return cat.contains("FISCAL") || cat.contains("XML") || tipo.contains("XML") || nome.endsWith(".XML");
                })
                .map(ClienteDocumento::getCompetencia)
                .collect(Collectors.toSet());

        // Inclui competências recentes (6 meses) mesmo sem XML, se houver indício de docs
        YearMonth atual = YearMonth.now();
        for (int i = 0; i < 6; i++) {
            YearMonth ym = atual.minusMonths(i);
            String key = String.format("%04d-%02d", ym.getYear(), ym.getMonthValue());
            porComp.putIfAbsent(key, List.of());
        }

        List<RadarFiscalCompetenciaDTO> out = new ArrayList<>();
        for (Map.Entry<String, List<NotaFiscalImport>> e : porComp.entrySet()) {
            String comp = e.getKey();
            List<NotaFiscalImport> lista = e.getValue();
            RadarFiscalCompetenciaDTO dto = new RadarFiscalCompetenciaDTO();
            dto.setCompetencia(comp);

            long qtdEnt = 0, qtdSai = 0, qtdSem = 0;
            BigDecimal vEnt = BigDecimal.ZERO;
            BigDecimal vSai = BigDecimal.ZERO;
            for (NotaFiscalImport n : lista) {
                if (!"OK".equalsIgnoreCase(n.getStatusParse()) && !"DUPLICADO".equalsIgnoreCase(n.getStatusParse())) {
                    continue;
                }
                BigDecimal valor = n.getValorTotal() != null ? n.getValorTotal() : BigDecimal.ZERO;
                String emit = n.getCnpjEmitente() != null ? n.getCnpjEmitente().replaceAll("\\D", "") : null;
                String dest = n.getCnpjDestinatario() != null ? n.getCnpjDestinatario().replaceAll("\\D", "") : null;
                if (cnpjCliente != null && cnpjCliente.equals(emit)) {
                    qtdSai++;
                    vSai = vSai.add(valor);
                } else if (cnpjCliente != null && cnpjCliente.equals(dest)) {
                    qtdEnt++;
                    vEnt = vEnt.add(valor);
                } else {
                    qtdSem++;
                }
            }
            long totalOk = qtdEnt + qtdSai + qtdSem;
            dto.setQtdEntrada(qtdEnt);
            dto.setQtdSaida(qtdSai);
            dto.setQtdSemClassificacao(qtdSem);
            dto.setValorEntrada(vEnt);
            dto.setValorSaida(vSai);
            dto.setTotalXml(lista.size());

            if (totalOk > 0) {
                dto.setStatus("OK");
                dto.setObservacao(null);
            } else if (compsComDocFiscal.contains(comp)) {
                dto.setStatus("PARCIAL");
                dto.setObservacao("Há documento(s) fiscal(is) na competência, mas nenhum XML parseado.");
            } else if (lista.isEmpty()) {
                dto.setStatus("SEM_XML");
                dto.setObservacao("Nenhum XML importado nesta competência.");
            } else {
                dto.setStatus("PARCIAL");
                dto.setObservacao("XMLs presentes, porém sem parse OK.");
            }
            out.add(dto);
        }

        // Remove competências vazias antigas sem docs (mantém só as 6 recentes SEM_XML ou com dados)
        YearMonth limite = atual.minusMonths(5);
        out.removeIf(r -> {
            if (!"SEM_XML".equals(r.getStatus())) return false;
            try {
                YearMonth ym = YearMonth.parse(r.getCompetencia());
                return ym.isBefore(limite);
            } catch (Exception ex) {
                return true;
            }
        });

        out.sort(Comparator.comparing(RadarFiscalCompetenciaDTO::getCompetencia, Comparator.nullsLast(Comparator.reverseOrder())));
        boolean temAlgo = out.stream().anyMatch(r -> r.getTotalXml() > 0 || Objects.equals(r.getStatus(), "PARCIAL"));
        if (!temAlgo && out.stream().allMatch(r -> "SEM_XML".equals(r.getStatus()))) {
            // Sem dados importados: retorna vazio para a UI não forçar painel
            return List.of();
        }
        return out;
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
