package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteCertificadoArquivo;
import br.com.someli.domain.NfseSyncEstado;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.NfseAdnStatusDTO;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.integration.CertificadoA1Reader;
import br.com.someli.repository.ClienteCertificadoArquivoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.NfseSyncEstadoRepository;
import br.com.someli.repository.NotaFiscalImportRepository;
import br.com.someli.security.CertificadoCrypto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Locale;

/**
 * Busca automática de NFS-e no ADN: guarda do certificado A1, ligar/pausar e busca manual.
 * Autorização sempre aqui (permissão + alçada sobre o cliente), antes de qualquer leitura de arquivo.
 */
@Service
public class NfseAdnService {

    static final long TAMANHO_MAXIMO = 100 * 1024;
    static final int INTERVALO_MINIMO_MINUTOS = 5;
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ClienteRepository clienteRepository;
    private final ClienteCertificadoArquivoRepository certificadoRepository;
    private final NfseSyncEstadoRepository estadoRepository;
    private final NotaFiscalImportRepository notaRepository;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;
    private final NfseAdnSyncService syncService;
    private final CertificadoCrypto crypto;
    private final Clock clock;
    private final boolean agendamentoLigado;

    @Autowired
    public NfseAdnService(ClienteRepository clienteRepository,
                          ClienteCertificadoArquivoRepository certificadoRepository,
                          NfseSyncEstadoRepository estadoRepository,
                          NotaFiscalImportRepository notaRepository,
                          AuthorizationService authorizationService,
                          AuditLogService auditLogService,
                          NfseAdnSyncService syncService,
                          CertificadoCrypto crypto,
                          Clock clock,
                          @Value("${nfse.adn.agendamento-ativo:false}") boolean agendamentoLigado) {
        this.clienteRepository = clienteRepository;
        this.certificadoRepository = certificadoRepository;
        this.estadoRepository = estadoRepository;
        this.notaRepository = notaRepository;
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
        this.syncService = syncService;
        this.crypto = crypto;
        this.clock = clock;
        this.agendamentoLigado = agendamentoLigado;
    }

    @Transactional(readOnly = true)
    public NfseAdnStatusDTO status(Long clienteId) {
        authorizationService.requireCompanyAccess(clienteId);
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        return montarStatus(clienteId);
    }

    @Transactional
    public NfseAdnStatusDTO salvarCertificado(Long clienteId, MultipartFile arquivo, String senha) throws IOException {
        authorizationService.requirePermission(PermissaoCodigo.CERTIFICADO_A1_GERENCIAR);
        authorizationService.requireCompanyAccess(clienteId);
        if (!crypto.configurado()) {
            throw new RegraNegocioException("Guarda de certificados desligada: configure CERTIFICADO_CHAVE_MESTRA no servidor");
        }
        validarArquivo(arquivo);
        if (senha == null || senha.isBlank() || senha.length() > 200) {
            throw new RegraNegocioException("Informe a senha do certificado");
        }
        Cliente cliente = buscarCliente(clienteId);
        String cnpjCliente = cliente.getCnpj() != null ? cliente.getCnpj().replaceAll("\\D", "") : "";
        if (cnpjCliente.length() != 14) {
            throw new RegraNegocioException("O cliente precisa ter CNPJ cadastrado para usar certificado A1");
        }

        byte[] pfx = arquivo.getBytes();
        char[] senhaChars = senha.toCharArray();
        CertificadoA1Reader.Info info;
        try {
            info = CertificadoA1Reader.ler(pfx, senhaChars);
        } finally {
            Arrays.fill(senhaChars, '\0');
        }
        if (info.vencido()) {
            throw new RegraNegocioException("Certificado vencido em " + info.validoAte().format(DATA) + ". Envie o certificado renovado.");
        }
        if (info.cnpj() == null || !info.cnpj().substring(0, 8).equals(cnpjCliente.substring(0, 8))) {
            throw new RegraNegocioException("O certificado é de outro CNPJ. Envie o certificado A1 do próprio cliente (mesma raiz de CNPJ).");
        }

        ClienteCertificadoArquivo cert = certificadoRepository.findByClienteId(clienteId).orElseGet(ClienteCertificadoArquivo::new);
        boolean substituicao = cert.getId() != null;
        cert.setCliente(cliente);
        cert.setPfxCifrado(crypto.cifrar(pfx, NfseAdnSyncService.contexto(clienteId)));
        cert.setSenhaCifrada(crypto.cifrar(senha.getBytes(StandardCharsets.UTF_8), NfseAdnSyncService.contexto(clienteId)));
        cert.setCnpjCertificado(info.cnpj());
        cert.setTitular(info.titular() != null && info.titular().length() > 200 ? info.titular().substring(0, 200) : info.titular());
        cert.setValidoAte(info.validoAte());
        cert.setEnviadoEm(LocalDateTime.now(clock));
        certificadoRepository.save(cert);

        cliente.setCertificadoTipo("A1");
        cliente.setCertificadoVencimento(info.validoAte());
        clienteRepository.save(cliente);

        NfseSyncEstado estado = estadoRepository.findByClienteId(clienteId).orElseGet(() -> {
            NfseSyncEstado novo = new NfseSyncEstado();
            novo.setCliente(cliente);
            return novo;
        });
        estado.setAtivo(true);
        estado.setProximaConsulta(LocalDateTime.now(clock));
        estadoRepository.save(estado);

        auditLogService.registrar(substituicao ? "CERTIFICADO_A1_SUBSTITUIDO" : "CERTIFICADO_A1_ENVIADO", "Cliente",
                String.valueOf(clienteId), null, "titular=" + info.titular() + "; validoAte=" + info.validoAte());
        return montarStatus(clienteId, cert, estado);
    }

    @Transactional
    public NfseAdnStatusDTO removerCertificado(Long clienteId) {
        authorizationService.requirePermission(PermissaoCodigo.CERTIFICADO_A1_GERENCIAR);
        authorizationService.requireCompanyAccess(clienteId);
        certificadoRepository.findByClienteId(clienteId).ifPresent(certificadoRepository::delete);
        estadoRepository.findByClienteId(clienteId).ifPresent(e -> {
            e.setAtivo(false);
            estadoRepository.save(e);
        });
        auditLogService.registrar("CERTIFICADO_A1_REMOVIDO", "Cliente", String.valueOf(clienteId), null, null);
        return montarStatus(clienteId);
    }

    @Transactional
    public NfseAdnStatusDTO alterarAtivo(Long clienteId, boolean ativo) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        authorizationService.requireCompanyAccess(clienteId);
        if (ativo && certificadoRepository.findByClienteId(clienteId).isEmpty()) {
            throw new RegraNegocioException("Envie o certificado A1 antes de ligar a busca de notas");
        }
        NfseSyncEstado estado = estadoRepository.findByClienteId(clienteId).orElseGet(() -> {
            NfseSyncEstado novo = new NfseSyncEstado();
            novo.setCliente(buscarCliente(clienteId));
            return novo;
        });
        estado.setAtivo(ativo);
        if (ativo && estado.getProximaConsulta() == null) estado.setProximaConsulta(LocalDateTime.now(clock));
        estadoRepository.save(estado);
        auditLogService.registrar(ativo ? "NFSE_ADN_LIGADA" : "NFSE_ADN_PAUSADA", "Cliente", String.valueOf(clienteId), null, null);
        return montarStatus(clienteId);
    }

    /** Sem @Transactional: a busca grava lote a lote, e uma falha no meio não desfaz o que já entrou. */
    public NfseAdnSyncService.Resultado sincronizarAgora(Long clienteId) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        authorizationService.requireCompanyAccess(clienteId);
        if (certificadoRepository.findByClienteId(clienteId).isEmpty()) {
            throw new RegraNegocioException("Envie o certificado A1 do cliente para buscar as notas");
        }
        NfseSyncEstado estado = estadoRepository.findByClienteId(clienteId)
                .orElseThrow(() -> new RegraNegocioException("Ligue a busca de notas antes de buscar"));
        LocalDateTime agora = LocalDateTime.now(clock);
        if ("LIMITE".equals(estado.getUltimoStatus()) && estado.getProximaConsulta() != null
                && estado.getProximaConsulta().isAfter(agora)) {
            throw new RegraNegocioException("O Portal Nacional pediu para aguardar. Tente às "
                    + estado.getProximaConsulta().format(HORA) + ".");
        }
        if (estado.getUltimaConsulta() != null
                && estado.getUltimaConsulta().isAfter(agora.minusMinutes(INTERVALO_MINIMO_MINUTOS))) {
            throw new RegraNegocioException("A última busca foi há menos de " + INTERVALO_MINIMO_MINUTOS
                    + " minutos. Tente às " + estado.getUltimaConsulta().plusMinutes(INTERVALO_MINIMO_MINUTOS).format(HORA) + ".");
        }
        return syncService.sincronizar(clienteId);
    }

    private void validarArquivo(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new RegraNegocioException("Selecione o arquivo do certificado (.pfx ou .p12)");
        }
        if (arquivo.getSize() > TAMANHO_MAXIMO) {
            throw new RegraNegocioException("Arquivo grande demais para um certificado A1 (máximo 100 KB)");
        }
        String nome = arquivo.getOriginalFilename() != null ? arquivo.getOriginalFilename().toLowerCase(Locale.ROOT) : "";
        if (!nome.endsWith(".pfx") && !nome.endsWith(".p12")) {
            throw new RegraNegocioException("Envie o certificado A1 em arquivo .pfx ou .p12");
        }
    }

    private Cliente buscarCliente(Long clienteId) {
        return clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado"));
    }

    private NfseAdnStatusDTO montarStatus(Long clienteId) {
        return montarStatus(clienteId,
                certificadoRepository.findByClienteId(clienteId).orElse(null),
                estadoRepository.findByClienteId(clienteId).orElse(null));
    }

    private NfseAdnStatusDTO montarStatus(Long clienteId, ClienteCertificadoArquivo c, NfseSyncEstado estado) {
        NfseAdnStatusDTO.Certificado certificado = c == null ? null
                : new NfseAdnStatusDTO.Certificado(c.getCnpjCertificado(), c.getTitular(), c.getValidoAte(),
                        c.getValidoAte() != null && c.getValidoAte().isBefore(LocalDate.now(clock)), c.getEnviadoEm());
        long notas = notaRepository.countByClienteIdAndOrigem(clienteId, NfseAdnSyncService.ORIGEM_ADN);
        return new NfseAdnStatusDTO(
                crypto.configurado(),
                agendamentoLigado,
                certificado,
                estado != null && estado.isAtivo(),
                estado != null ? estado.getUltimoNsu() : null,
                estado != null ? estado.getUltimaConsulta() : null,
                estado != null ? estado.getProximaConsulta() : null,
                estado != null ? estado.getUltimoStatus() : null,
                estado != null ? estado.getUltimaMensagem() : null,
                notas);
    }
}
