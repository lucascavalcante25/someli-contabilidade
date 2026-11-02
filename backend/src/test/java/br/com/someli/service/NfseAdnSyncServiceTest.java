package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteCertificadoArquivo;
import br.com.someli.domain.ClienteDocumento;
import br.com.someli.domain.NfseSyncEstado;
import br.com.someli.domain.NotaFiscalImport;
import br.com.someli.integration.AdnNfseClient;
import br.com.someli.integration.AdnNfseResposta;
import br.com.someli.integration.AdnNfseResposta.Documento;
import br.com.someli.integration.AdnNfseResposta.Situacao;
import br.com.someli.integration.CertificadoA1ReaderTest;
import br.com.someli.repository.ClienteCertificadoArquivoRepository;
import br.com.someli.repository.NfseSyncEstadoRepository;
import br.com.someli.repository.NotaFiscalImportRepository;
import br.com.someli.security.CertificadoCrypto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NfseAdnSyncServiceTest {

    static final String CHAVE_MESTRA = Base64.getEncoder().encodeToString("0123456789abcdef0123456789abcdef".getBytes());
    static final String CHAVE_NFSE = "35503082211222333000181000000000001226100000000012";

    @Mock private NfseSyncEstadoRepository estadoRepository;
    @Mock private ClienteCertificadoArquivoRepository certificadoRepository;
    @Mock private NotaFiscalImportRepository notaRepository;
    @Mock private ClienteDocumentoService documentoService;
    @Mock private AdnNfseClient adnClient;

    private final CertificadoCrypto crypto = new CertificadoCrypto(CHAVE_MESTRA);
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-02T15:00:00Z"), ZoneId.of("America/Sao_Paulo"));
    private final LocalDateTime agora = LocalDateTime.now(clock);

    private NfseAdnSyncService service;
    private Cliente cliente;
    private NfseSyncEstado estado;

    @BeforeEach
    void setUp() throws IOException {
        service = new NfseAdnSyncService(estadoRepository, certificadoRepository, notaRepository, documentoService,
                crypto, adnClient, clock);
        cliente = new Cliente();
        cliente.setId(7L);
        cliente.setCnpj("11.222.333/0001-81");

        estado = new NfseSyncEstado();
        estado.setCliente(cliente);
        estado.setAtivo(true);
        estado.setUltimoNsu(100L);
        when(estadoRepository.findByClienteId(7L)).thenReturn(Optional.of(estado));

        ClienteCertificadoArquivo cert = new ClienteCertificadoArquivo();
        cert.setCliente(cliente);
        cert.setPfxCifrado(crypto.cifrar(CertificadoA1ReaderTest.fixture("valido-11222333000181.p12"), "cliente:7"));
        cert.setSenhaCifrada(crypto.cifrar("teste123".getBytes(StandardCharsets.UTF_8), "cliente:7"));
        when(certificadoRepository.findByClienteId(7L)).thenReturn(Optional.of(cert));

        when(notaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(documentoService.salvarXmlSistema(any(), any(), anyString(), any(), anyString()))
                .thenReturn(new ClienteDocumento());
    }

    private static Documento nota(long nsu, String chave) {
        String xml = br.com.someli.integration.XmlNotaFiscalParserTest.NFSE_NACIONAL.replace(CHAVE_NFSE, chave);
        return new Documento(nsu, chave, "NFSE", xml.getBytes(StandardCharsets.UTF_8));
    }

    private static Documento cancelamento(long nsu, String chave) {
        String xml = "<evento><infEvento><pedRegEvento><infPedReg><chNFSe>" + chave
                + "</chNFSe><e101101><xDesc>Cancelamento</xDesc></e101101></infPedReg></pedRegEvento></infEvento></evento>";
        return new Documento(nsu, chave, "EVENTO", xml.getBytes(StandardCharsets.UTF_8));
    }

    private static String chave(long n) {
        return String.format("%050d", n);
    }

    @Test
    void loteComNotas_salvaXmlComoDocumentoENotaDeOrigemAdn_eAvancaNsu() throws Exception {
        when(adnClient.consultarLote(any(), any(), eq("11222333000181"), eq(100L)))
                .thenReturn(AdnNfseResposta.documentos(List.of(nota(101, CHAVE_NFSE))));

        NfseAdnSyncService.Resultado r = service.sincronizar(7L);

        ArgumentCaptor<NotaFiscalImport> salva = ArgumentCaptor.forClass(NotaFiscalImport.class);
        verify(notaRepository).save(salva.capture());
        NotaFiscalImport n = salva.getValue();
        assertThat(n.getOrigem()).isEqualTo("ADN");
        assertThat(n.getNsu()).isEqualTo(101L);
        assertThat(n.getTipo()).isEqualTo("NFSE");
        assertThat(n.getChaveAcesso()).isEqualTo(CHAVE_NFSE);
        assertThat(n.getCompetencia()).isEqualTo("2026-09");
        assertThat(n.getCliente()).isSameAs(cliente);
        assertThat(n.getStatusParse()).isEqualTo("OK");
        verify(documentoService).salvarXmlSistema(eq(cliente), any(), eq("NFSe_" + CHAVE_NFSE + ".xml"), eq("2026-09"), eq("ADN_NFSE"));

        assertThat(estado.getUltimoNsu()).isEqualTo(101L);
        assertThat(estado.getUltimoStatus()).isEqualTo("EM_DIA");
        assertThat(estado.getUltimaConsulta()).isEqualTo(agora);
        assertThat(estado.getProximaConsulta()).isEqualTo(agora.plusHours(1));
        assertThat(r.novas()).isEqualTo(1);
    }

    @Test
    void reentregaDaMesmaNota_naoDuplica() throws Exception {
        when(notaRepository.existsByChaveAcesso(CHAVE_NFSE)).thenReturn(true);
        when(adnClient.consultarLote(any(), any(), anyString(), anyLong()))
                .thenReturn(AdnNfseResposta.documentos(List.of(nota(101, CHAVE_NFSE))));

        NfseAdnSyncService.Resultado r = service.sincronizar(7L);

        verify(notaRepository, never()).save(any());
        verify(documentoService, never()).salvarXmlSistema(any(), any(), anyString(), any(), anyString());
        assertThat(r.novas()).isZero();
        assertThat(estado.getUltimoNsu()).isEqualTo(101L);
    }

    @Test
    void loteCheio_buscaProximaPagina_ateFicarEmDia() throws Exception {
        List<Documento> cheio = new ArrayList<>();
        LongStream.rangeClosed(101, 150).forEach(nsu -> cheio.add(nota(nsu, chave(nsu))));
        when(adnClient.consultarLote(any(), any(), anyString(), eq(100L))).thenReturn(AdnNfseResposta.documentos(cheio));
        when(adnClient.consultarLote(any(), any(), anyString(), eq(150L))).thenReturn(AdnNfseResposta.semDocumentos());

        NfseAdnSyncService.Resultado r = service.sincronizar(7L);

        verify(adnClient, times(2)).consultarLote(any(), any(), anyString(), anyLong());
        assertThat(r.novas()).isEqualTo(50);
        assertThat(estado.getUltimoNsu()).isEqualTo(150L);
        assertThat(estado.getUltimoStatus()).isEqualTo("EM_DIA");
    }

    @Test
    void eventoDeCancelamento_marcaNotaDoClienteComoCancelada() throws Exception {
        NotaFiscalImport existente = new NotaFiscalImport();
        existente.setCliente(cliente);
        existente.setChaveAcesso(CHAVE_NFSE);
        existente.setStatusParse("OK");
        when(notaRepository.findByChaveAcesso(CHAVE_NFSE)).thenReturn(Optional.of(existente));
        when(adnClient.consultarLote(any(), any(), anyString(), anyLong()))
                .thenReturn(AdnNfseResposta.documentos(List.of(cancelamento(101, CHAVE_NFSE))));

        NfseAdnSyncService.Resultado r = service.sincronizar(7L);

        assertThat(existente.getStatusParse()).isEqualTo("CANCELADA");
        assertThat(r.canceladas()).isEqualTo(1);
    }

    @Test
    void cancelamentoDeNotaDeOutroCliente_naoMexe() throws Exception {
        Cliente outro = new Cliente();
        outro.setId(99L);
        NotaFiscalImport alheia = new NotaFiscalImport();
        alheia.setCliente(outro);
        alheia.setStatusParse("OK");
        when(notaRepository.findByChaveAcesso(CHAVE_NFSE)).thenReturn(Optional.of(alheia));
        when(adnClient.consultarLote(any(), any(), anyString(), anyLong()))
                .thenReturn(AdnNfseResposta.documentos(List.of(cancelamento(101, CHAVE_NFSE))));

        service.sincronizar(7L);

        assertThat(alheia.getStatusParse()).isEqualTo("OK");
    }

    @Test
    void semDocumentos_ficaEmDia_eProximaConsultaEmUmaHora() throws Exception {
        when(adnClient.consultarLote(any(), any(), anyString(), anyLong())).thenReturn(AdnNfseResposta.semDocumentos());

        service.sincronizar(7L);

        assertThat(estado.getUltimoNsu()).isEqualTo(100L);
        assertThat(estado.getUltimoStatus()).isEqualTo("EM_DIA");
        assertThat(estado.getProximaConsulta()).isEqualTo(agora.plusHours(1));
        verify(estadoRepository).save(estado);
    }

    @Test
    void limiteDoAdn_respeitaRetryAfter() throws Exception {
        when(adnClient.consultarLote(any(), any(), anyString(), anyLong()))
                .thenReturn(new AdnNfseResposta(Situacao.LIMITE, List.of(), "Limite de consultas do ADN", 7200));

        service.sincronizar(7L);

        assertThat(estado.getUltimoStatus()).isEqualTo("LIMITE");
        assertThat(estado.getProximaConsulta()).isEqualTo(agora.plusSeconds(7200));
    }

    @Test
    void erroDoAdn_guardaMensagem_naoAvancaNsu() throws Exception {
        when(adnClient.consultarLote(any(), any(), anyString(), anyLong()))
                .thenReturn(new AdnNfseResposta(Situacao.ERRO, List.of(), "E1235: Certificado não autorizado", null));

        NfseAdnSyncService.Resultado r = service.sincronizar(7L);

        assertThat(estado.getUltimoStatus()).isEqualTo("ERRO");
        assertThat(estado.getUltimaMensagem()).isEqualTo("E1235: Certificado não autorizado");
        assertThat(estado.getUltimoNsu()).isEqualTo(100L);
        assertThat(r.status()).isEqualTo("ERRO");
    }

    @Test
    void falhaDeRede_viraErroDeConexao_semExplodirOJob() throws Exception {
        when(adnClient.consultarLote(any(), any(), anyString(), anyLong())).thenThrow(new IOException("connect timed out"));

        NfseAdnSyncService.Resultado r = service.sincronizar(7L);

        assertThat(r.status()).isEqualTo("ERRO");
        assertThat(estado.getUltimaMensagem()).isEqualTo("Sem conexão com o Portal Nacional da NFS-e. Nova tentativa em 1 hora.");
        assertThat(estado.getProximaConsulta()).isEqualTo(agora.plusHours(1));
    }

    @Test
    void portalRecusaHandshakeTls_avisaQueOCertificadoNaoFoiAceito_naoComoFaltaDeRede() throws Exception {
        when(adnClient.consultarLote(any(), any(), anyString(), anyLong()))
                .thenThrow(new IOException("header parser received no bytes", new javax.net.ssl.SSLException("Tag mismatch")));

        NfseAdnSyncService.Resultado r = service.sincronizar(7L);

        assertThat(r.status()).isEqualTo("ERRO");
        assertThat(estado.getUltimaMensagem()).isEqualTo(
                "O Portal Nacional recusou a conexão com este certificado. Confira se é o A1 ICP-Brasil válido do cliente.");
    }

    @Test
    void certificadoQueNaoAbreMaisComAChaveAtual_pedeNovoEnvio_semConsultarAdn() throws Exception {
        CertificadoCrypto outraChave = new CertificadoCrypto(
                Base64.getEncoder().encodeToString("fedcba9876543210fedcba9876543210".getBytes()));
        ClienteCertificadoArquivo cert = new ClienteCertificadoArquivo();
        cert.setCliente(cliente);
        cert.setPfxCifrado(outraChave.cifrar(new byte[]{1, 2, 3}, "cliente:7"));
        cert.setSenhaCifrada(outraChave.cifrar(new byte[]{4}, "cliente:7"));
        when(certificadoRepository.findByClienteId(7L)).thenReturn(Optional.of(cert));

        NfseAdnSyncService.Resultado r = service.sincronizar(7L);

        assertThat(r.status()).isEqualTo("ERRO");
        assertThat(estado.getUltimaMensagem())
                .isEqualTo("O certificado guardado não pôde ser aberto no servidor. Envie o certificado A1 de novo.");
        verify(adnClient, never()).consultarLote(any(), any(), anyString(), anyLong());
    }

    @Test
    void semCertificado_naoConsultaAdn() throws Exception {
        when(certificadoRepository.findByClienteId(7L)).thenReturn(Optional.empty());

        NfseAdnSyncService.Resultado r = service.sincronizar(7L);

        assertThat(r.status()).isEqualTo("SEM_CERTIFICADO");
        verify(adnClient, never()).consultarLote(any(), any(), anyString(), anyLong());
    }
}
