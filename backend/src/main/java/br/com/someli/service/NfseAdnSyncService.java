package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteCertificadoArquivo;
import br.com.someli.domain.ClienteDocumento;
import br.com.someli.domain.NfseSyncEstado;
import br.com.someli.domain.NotaFiscalImport;
import br.com.someli.integration.AdnNfseClient;
import br.com.someli.integration.AdnNfseResposta;
import br.com.someli.integration.CertificadoA1Reader;
import br.com.someli.integration.XmlNotaFiscalParser;
import br.com.someli.repository.ClienteCertificadoArquivoRepository;
import br.com.someli.repository.NfseSyncEstadoRepository;
import br.com.someli.repository.NotaFiscalImportRepository;
import br.com.someli.security.CertificadoCrypto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Busca as NFS-e do cliente no ADN e grava como nota + XML na aba Docs (competência da nota).
 * Sem autorização de usuário: é chamado pelo job ou por NfseAdnService, que já autorizou.
 * Idempotente: nota já conhecida (mesma chave) não é gravada de novo; NSU só avança.
 */
@Service
public class NfseAdnSyncService {

    public record Resultado(String status, String mensagem, int novas, int canceladas) {
    }

    public static final String ORIGEM_ADN = "ADN";
    static final int TAMANHO_LOTE = 50;
    static final int MAX_PAGINAS = 20;
    private static final Logger log = LoggerFactory.getLogger(NfseAdnSyncService.class);

    private final NfseSyncEstadoRepository estadoRepository;
    private final ClienteCertificadoArquivoRepository certificadoRepository;
    private final NotaFiscalImportRepository notaRepository;
    private final ClienteDocumentoService documentoService;
    private final CertificadoCrypto crypto;
    private final AdnNfseClient adnClient;
    private final Clock clock;
    private final Set<Long> emAndamento = ConcurrentHashMap.newKeySet();

    @Autowired
    public NfseAdnSyncService(NfseSyncEstadoRepository estadoRepository,
                              ClienteCertificadoArquivoRepository certificadoRepository,
                              NotaFiscalImportRepository notaRepository,
                              ClienteDocumentoService documentoService,
                              CertificadoCrypto crypto,
                              AdnNfseClient adnClient,
                              Clock clock) {
        this.estadoRepository = estadoRepository;
        this.certificadoRepository = certificadoRepository;
        this.notaRepository = notaRepository;
        this.documentoService = documentoService;
        this.crypto = crypto;
        this.adnClient = adnClient;
        this.clock = clock;
    }

    public static String contexto(Long clienteId) {
        return "cliente:" + clienteId;
    }

    public Resultado sincronizar(Long clienteId) {
        if (!emAndamento.add(clienteId)) {
            return new Resultado("EM_ANDAMENTO", "Já existe uma busca em andamento para este cliente.", 0, 0);
        }
        try {
            return executar(clienteId);
        } finally {
            emAndamento.remove(clienteId);
        }
    }

    private Resultado executar(Long clienteId) {
        NfseSyncEstado estado = estadoRepository.findByClienteId(clienteId)
                .orElseThrow(() -> new IllegalStateException("Busca de NFS-e não configurada para o cliente"));
        LocalDateTime agora = LocalDateTime.now(clock);
        estado.setUltimaConsulta(agora);
        estado.setProximaConsulta(agora.plusHours(1));

        ClienteCertificadoArquivo cert = certificadoRepository.findByClienteId(clienteId).orElse(null);
        if (cert == null) {
            return encerrar(estado, "SEM_CERTIFICADO", "Envie o certificado A1 do cliente para buscar as notas.", 0, 0);
        }

        Cliente cliente = estado.getCliente();
        String cnpj = cliente.getCnpj() != null ? cliente.getCnpj().replaceAll("\\D", "") : "";
        int novas = 0;
        int canceladas = 0;
        char[] senha = null;
        byte[] pfx;
        try {
            pfx = crypto.decifrar(cert.getPfxCifrado(), contexto(clienteId));
            senha = paraChars(crypto.decifrar(cert.getSenhaCifrada(), contexto(clienteId)));
        } catch (IllegalStateException e) {
            // Chave mestra trocada no servidor ou dado alterado: só um novo envio resolve.
            log.warn("ADN NFS-e: certificado do cliente {} não abre com a chave mestra atual", clienteId);
            return encerrar(estado, "ERRO",
                    "O certificado guardado não pôde ser aberto no servidor. Envie o certificado A1 de novo.", 0, 0);
        }
        try {
            KeyStore ks = CertificadoA1Reader.abrir(pfx, senha);

            for (int pagina = 0; pagina < MAX_PAGINAS; pagina++) {
                AdnNfseResposta resp = adnClient.consultarLote(ks, senha, cnpj, estado.getUltimoNsu());
                switch (resp.situacao()) {
                    case SEM_DOCUMENTOS -> {
                        return encerrar(estado, "EM_DIA", mensagemEmDia(novas, canceladas), novas, canceladas);
                    }
                    case LIMITE -> {
                        int espera = resp.retryAfterSegundos() != null && resp.retryAfterSegundos() > 0
                                ? resp.retryAfterSegundos() : 3600;
                        estado.setProximaConsulta(agora.plusSeconds(espera));
                        return encerrar(estado, "LIMITE", "O Portal Nacional pediu para aguardar antes da próxima busca.",
                                novas, canceladas);
                    }
                    case ERRO -> {
                        return encerrar(estado, "ERRO", resp.mensagem(), novas, canceladas);
                    }
                    case DOCUMENTOS -> {
                        long maiorNsu = estado.getUltimoNsu();
                        for (AdnNfseResposta.Documento doc : resp.documentos()) {
                            if (doc.nsu() <= estado.getUltimoNsu()) continue;
                            if (doc.nota() && gravarNota(cliente, doc)) novas++;
                            if (doc.evento() && aplicarEvento(cliente, doc)) canceladas++;
                            maiorNsu = Math.max(maiorNsu, doc.nsu());
                        }
                        boolean avancou = maiorNsu > estado.getUltimoNsu();
                        estado.setUltimoNsu(maiorNsu);
                        estadoRepository.save(estado);
                        if (!avancou || resp.documentos().size() < TAMANHO_LOTE) {
                            return encerrar(estado, "EM_DIA", mensagemEmDia(novas, canceladas), novas, canceladas);
                        }
                    }
                }
            }
            estado.setProximaConsulta(agora.plusMinutes(5));
            return encerrar(estado, "EM_DIA", "Muitas notas: a busca continua na próxima rodada. " + mensagemEmDia(novas, canceladas),
                    novas, canceladas);
        } catch (IOException e) {
            boolean tls = causadoPorTls(e);
            log.warn("ADN NFS-e: falha de {} (cliente {}): {}", tls ? "TLS" : "conexão", clienteId, e.getClass().getSimpleName());
            String msg = tls
                    ? "O Portal Nacional recusou a conexão com este certificado. Confira se é o A1 ICP-Brasil válido do cliente."
                    : "Sem conexão com o Portal Nacional da NFS-e. Nova tentativa em 1 hora.";
            return encerrar(estado, "ERRO", msg, novas, canceladas);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return encerrar(estado, "ERRO", "Busca interrompida.", novas, canceladas);
        } catch (RuntimeException e) {
            log.warn("ADN NFS-e: falha na busca (cliente {}): {}", clienteId, e.getClass().getSimpleName());
            String msg = e instanceof br.com.someli.exception.RegraNegocioException ? e.getMessage() : "Falha ao processar a busca.";
            return encerrar(estado, "ERRO", msg, novas, canceladas);
        } finally {
            if (senha != null) Arrays.fill(senha, '\0');
        }
    }

    private boolean gravarNota(Cliente cliente, AdnNfseResposta.Documento doc) throws IOException {
        if (doc.xml() == null) return false;
        XmlNotaFiscalParser.Resultado parsed = XmlNotaFiscalParser.parse(doc.xml());
        String chave = digitos(doc.chave()) != null ? digitos(doc.chave()) : parsed.chaveAcesso;
        if (chave == null || chave.length() > 60 || notaRepository.existsByChaveAcesso(chave)) {
            return false;
        }
        String competencia = parsed.competencia != null ? parsed.competencia
                : XmlNotaFiscalParser.competenciaDe(parsed.dataEmissao).orElse(null);
        if (competencia != null && !competencia.matches("\\d{4}-\\d{2}")) competencia = null;

        ClienteDocumento arquivo = documentoService.salvarXmlSistema(cliente, doc.xml(), "NFSe_" + chave + ".xml",
                competencia, "ADN_NFSE");

        NotaFiscalImport nota = new NotaFiscalImport();
        nota.setCliente(cliente);
        nota.setDocumento(arquivo);
        nota.setTipo("NFSE");
        nota.setOrigem(ORIGEM_ADN);
        nota.setNsu(doc.nsu());
        nota.setChaveAcesso(chave);
        nota.setNumero(parsed.numero);
        nota.setSerie(parsed.serie);
        nota.setCnpjEmitente(parsed.cnpjEmitente);
        nota.setCnpjDestinatario(parsed.cnpjDestinatario);
        nota.setDataEmissao(parsed.dataEmissao);
        nota.setValorTotal(parsed.valorTotal);
        nota.setCompetencia(competencia);
        nota.setNomeArquivo("NFSe_" + chave + ".xml");
        nota.setStatusParse(parsed.ok ? "OK" : "ERRO");
        nota.setMensagemErro(parsed.mensagemErro);
        notaRepository.save(nota);
        return true;
    }

    private boolean aplicarEvento(Cliente cliente, AdnNfseResposta.Documento doc) {
        return XmlNotaFiscalParser.parseEventoNfse(doc.xml())
                .filter(XmlNotaFiscalParser.EventoNfse::cancelamento)
                .flatMap(ev -> notaRepository.findByChaveAcesso(ev.chave())
                        .filter(n -> n.getCliente() != null && Objects.equals(n.getCliente().getId(), cliente.getId()))
                        .filter(n -> !"CANCELADA".equals(n.getStatusParse()))
                        .map(n -> {
                            n.setStatusParse("CANCELADA");
                            n.setMensagemErro("Cancelada no Portal Nacional (evento " + ev.codigo() + ")");
                            notaRepository.save(n);
                            return true;
                        }))
                .orElse(false);
    }

    private Resultado encerrar(NfseSyncEstado estado, String status, String mensagem, int novas, int canceladas) {
        estado.setUltimoStatus(status);
        estado.setUltimaMensagem(mensagem);
        estadoRepository.save(estado);
        return new Resultado(status, mensagem, novas, canceladas);
    }

    private static String mensagemEmDia(int novas, int canceladas) {
        if (novas == 0 && canceladas == 0) return "Nenhuma nota nova.";
        String texto = novas == 1 ? "1 nota nova" : novas + " notas novas";
        return canceladas > 0 ? texto + ", " + canceladas + " cancelada(s)." : texto + ".";
    }

    /** O ADN derruba o handshake quando o certificado não é aceito; isso não é falta de rede. */
    private static boolean causadoPorTls(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof javax.net.ssl.SSLException) return true;
        }
        return false;
    }

    private static String digitos(String s) {
        if (s == null) return null;
        String d = s.replaceAll("\\D", "");
        return d.isEmpty() ? null : d;
    }

    private static char[] paraChars(byte[] utf8) {
        CharBuffer cb = StandardCharsets.UTF_8.decode(ByteBuffer.wrap(utf8));
        char[] out = Arrays.copyOf(cb.array(), cb.limit());
        Arrays.fill(utf8, (byte) 0);
        Arrays.fill(cb.array(), '\0');
        return out;
    }
}
