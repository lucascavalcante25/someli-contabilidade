package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteCertificadoArquivo;
import br.com.someli.domain.NfseSyncEstado;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.NfseAdnStatusDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.integration.CertificadoA1ReaderTest;
import br.com.someli.repository.ClienteCertificadoArquivoRepository;
import br.com.someli.repository.ClienteRepository;
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
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NfseAdnServiceTest {

    @Mock private ClienteRepository clienteRepository;
    @Mock private ClienteCertificadoArquivoRepository certificadoRepository;
    @Mock private NfseSyncEstadoRepository estadoRepository;
    @Mock private NotaFiscalImportRepository notaRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private AuditLogService auditLogService;
    @Mock private NfseAdnSyncService syncService;

    private final CertificadoCrypto crypto = new CertificadoCrypto(NfseAdnSyncServiceTest.CHAVE_MESTRA);
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-02T15:00:00Z"), ZoneId.of("America/Sao_Paulo"));
    private final LocalDateTime agora = LocalDateTime.now(clock);

    private NfseAdnService service;
    private Cliente cliente;

    @BeforeEach
    void setUp() {
        service = novoService(crypto);
        cliente = new Cliente();
        cliente.setId(7L);
        cliente.setCnpj("11222333000262"); // filial: mesma raiz do certificado da matriz
        when(clienteRepository.findById(7L)).thenReturn(Optional.of(cliente));
        when(estadoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(certificadoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private NfseAdnService novoService(CertificadoCrypto c) {
        return new NfseAdnService(clienteRepository, certificadoRepository, estadoRepository, notaRepository,
                authorizationService, auditLogService, syncService, c, clock, true);
    }

    private static MockMultipartFile pfx(String fixture, String nome) throws IOException {
        return new MockMultipartFile("arquivo", nome, "application/x-pkcs12", CertificadoA1ReaderTest.fixture(fixture));
    }

    private void comCertificado() {
        ClienteCertificadoArquivo cert = new ClienteCertificadoArquivo();
        cert.setCliente(cliente);
        when(certificadoRepository.findByClienteId(7L)).thenReturn(Optional.of(cert));
    }

    private NfseSyncEstado comEstado(LocalDateTime ultimaConsulta) {
        NfseSyncEstado e = new NfseSyncEstado();
        e.setCliente(cliente);
        e.setAtivo(true);
        e.setUltimaConsulta(ultimaConsulta);
        when(estadoRepository.findByClienteId(7L)).thenReturn(Optional.of(e));
        return e;
    }

    // ---------- autorização ----------

    @Test
    void status_semAlcada_nega() {
        doThrow(new AcessoNegadoException("Sem alçada")).when(authorizationService).requireCompanyAccess(7L);
        assertThatThrownBy(() -> service.status(7L)).isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void status_semPermissao_nega() {
        doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        assertThatThrownBy(() -> service.status(7L)).isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void enviarCertificado_semPermissaoDeCertificado_nega_semLerArquivo() {
        doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.CERTIFICADO_A1_GERENCIAR);

        assertThatThrownBy(() -> service.salvarCertificado(7L, pfx("valido-11222333000181.p12", "a.pfx"), "teste123"))
                .isInstanceOf(AcessoNegadoException.class);
        verify(certificadoRepository, never()).save(any());
    }

    @Test
    void enviarCertificado_semAlcada_nega() {
        doThrow(new AcessoNegadoException("Sem alçada")).when(authorizationService).requireCompanyAccess(7L);

        assertThatThrownBy(() -> service.salvarCertificado(7L, pfx("valido-11222333000181.p12", "a.pfx"), "teste123"))
                .isInstanceOf(AcessoNegadoException.class);
        verify(certificadoRepository, never()).save(any());
    }

    @Test
    void removerCertificado_semPermissao_nega() {
        doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.CERTIFICADO_A1_GERENCIAR);
        assertThatThrownBy(() -> service.removerCertificado(7L)).isInstanceOf(AcessoNegadoException.class);
        verify(certificadoRepository, never()).delete(any());
    }

    @Test
    void sincronizarAgora_semPermissaoDeEditar_nega() {
        doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        assertThatThrownBy(() -> service.sincronizarAgora(7L)).isInstanceOf(AcessoNegadoException.class);
        verifyNoInteractions(syncService);
    }

    @Test
    void sincronizarAgora_semAlcada_nega() {
        doThrow(new AcessoNegadoException("Sem alçada")).when(authorizationService).requireCompanyAccess(7L);
        assertThatThrownBy(() -> service.sincronizarAgora(7L)).isInstanceOf(AcessoNegadoException.class);
        verifyNoInteractions(syncService);
    }

    @Test
    void alterarAtivo_semAlcada_nega() {
        doThrow(new AcessoNegadoException("Sem alçada")).when(authorizationService).requireCompanyAccess(7L);
        assertThatThrownBy(() -> service.alterarAtivo(7L, false)).isInstanceOf(AcessoNegadoException.class);
        verify(estadoRepository, never()).save(any());
    }

    // ---------- envio do certificado ----------

    @Test
    void enviarCertificado_valido_guardaCifrado_ativaSincronizacao_eAtualizaVencimento() throws IOException {
        byte[] original = CertificadoA1ReaderTest.fixture("valido-11222333000181.p12");

        NfseAdnStatusDTO dto = service.salvarCertificado(7L, pfx("valido-11222333000181.p12", "Empresa.PFX"), "teste123");

        ArgumentCaptor<ClienteCertificadoArquivo> salvo = ArgumentCaptor.forClass(ClienteCertificadoArquivo.class);
        verify(certificadoRepository).save(salvo.capture());
        ClienteCertificadoArquivo c = salvo.getValue();
        assertThat(c.getPfxCifrado()).isNotEqualTo(original);
        assertThat(crypto.decifrar(c.getPfxCifrado(), "cliente:7")).isEqualTo(original);
        assertThat(new String(crypto.decifrar(c.getSenhaCifrada(), "cliente:7"), StandardCharsets.UTF_8)).isEqualTo("teste123");
        assertThat(c.getCnpjCertificado()).isEqualTo("11222333000181");

        ArgumentCaptor<NfseSyncEstado> estado = ArgumentCaptor.forClass(NfseSyncEstado.class);
        verify(estadoRepository).save(estado.capture());
        assertThat(estado.getValue().isAtivo()).isTrue();
        assertThat(estado.getValue().getProximaConsulta()).isEqualTo(agora);

        assertThat(cliente.getCertificadoTipo()).isEqualTo("A1");
        assertThat(cliente.getCertificadoVencimento()).isEqualTo(c.getValidoAte());
        assertThat(dto.certificado().titular()).isEqualTo("EMPRESA TESTE LTDA");
    }

    @Test
    void enviarCertificado_auditoriaNaoGuardaSenha() throws IOException {
        service.salvarCertificado(7L, pfx("valido-11222333000181.p12", "a.pfx"), "teste123");

        ArgumentCaptor<String> novo = ArgumentCaptor.forClass(String.class);
        verify(auditLogService).registrar(eq("CERTIFICADO_A1_ENVIADO"), eq("Cliente"), eq("7"), any(), novo.capture());
        assertThat(novo.getValue()).doesNotContain("teste123");
    }

    @Test
    void enviarCertificado_deOutroCnpj_rejeita() {
        assertThatThrownBy(() -> service.salvarCertificado(7L, pfx("outra-empresa-99888777000166.p12", "a.pfx"), "teste123"))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("outro CNPJ");
        verify(certificadoRepository, never()).save(any());
    }

    @Test
    void enviarCertificado_vencido_rejeita() {
        assertThatThrownBy(() -> service.salvarCertificado(7L, pfx("vencido-11222333000181.p12", "a.pfx"), "teste123"))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("vencido");
        verify(certificadoRepository, never()).save(any());
    }

    @Test
    void enviarCertificado_senhaErrada_rejeita() {
        assertThatThrownBy(() -> service.salvarCertificado(7L, pfx("valido-11222333000181.p12", "a.pfx"), "errada"))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessage("Senha incorreta ou arquivo de certificado inválido");
    }

    @Test
    void enviarCertificado_extensaoNaoPermitida_rejeita() {
        assertThatThrownBy(() -> service.salvarCertificado(7L, pfx("valido-11222333000181.p12", "cert.exe"), "teste123"))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining(".pfx");
    }

    @Test
    void enviarCertificado_arquivoGrande_rejeita() {
        MockMultipartFile grande = new MockMultipartFile("arquivo", "a.pfx", "application/x-pkcs12", new byte[100 * 1024 + 1]);
        assertThatThrownBy(() -> service.salvarCertificado(7L, grande, "teste123"))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("100 KB");
    }

    @Test
    void enviarCertificado_semSenha_rejeita() {
        assertThatThrownBy(() -> service.salvarCertificado(7L, pfx("valido-11222333000181.p12", "a.pfx"), " "))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("senha");
    }

    @Test
    void enviarCertificado_semChaveMestraNoServidor_rejeitaAntesDeLer() {
        service = novoService(new CertificadoCrypto(""));
        assertThatThrownBy(() -> service.salvarCertificado(7L, pfx("valido-11222333000181.p12", "a.pfx"), "teste123"))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("CERTIFICADO_CHAVE_MESTRA");
    }

    // ---------- remoção e controle ----------

    @Test
    void removerCertificado_apagaArquivoEDesligaSincronizacao() {
        comCertificado();
        NfseSyncEstado e = comEstado(null);

        service.removerCertificado(7L);

        verify(certificadoRepository).delete(any());
        assertThat(e.isAtivo()).isFalse();
        verify(auditLogService).registrar(eq("CERTIFICADO_A1_REMOVIDO"), eq("Cliente"), eq("7"), any(), any());
    }

    @Test
    void ativar_semCertificado_rejeita() {
        when(certificadoRepository.findByClienteId(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.alterarAtivo(7L, true))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("certificado");
    }

    @Test
    void sincronizarAgora_respeitaIntervaloMinimo() {
        comCertificado();
        comEstado(agora.minusMinutes(2));

        assertThatThrownBy(() -> service.sincronizarAgora(7L))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("5 minutos");
        verifyNoInteractions(syncService);
    }

    @Test
    void sincronizarAgora_respeitaPausaPedidaPeloAdn() {
        comCertificado();
        NfseSyncEstado e = comEstado(agora.minusMinutes(30));
        e.setUltimoStatus("LIMITE");
        e.setProximaConsulta(agora.plusMinutes(40));

        assertThatThrownBy(() -> service.sincronizarAgora(7L))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("aguardar");
        verifyNoInteractions(syncService);
    }

    @Test
    void sincronizarAgora_chamaSincronizacao() {
        comCertificado();
        comEstado(agora.minusMinutes(10));
        when(syncService.sincronizar(7L)).thenReturn(new NfseAdnSyncService.Resultado("EM_DIA", "ok", 3, 0));

        NfseAdnSyncService.Resultado r = service.sincronizarAgora(7L);

        assertThat(r.novas()).isEqualTo(3);
    }

    @Test
    void status_semCertificado_informaHabilitadoESemCertificado() {
        when(certificadoRepository.findByClienteId(7L)).thenReturn(Optional.empty());
        when(estadoRepository.findByClienteId(7L)).thenReturn(Optional.empty());

        NfseAdnStatusDTO dto = service.status(7L);

        assertThat(dto.habilitado()).isTrue();
        assertThat(dto.certificado()).isNull();
        assertThat(dto.ativo()).isFalse();
        verify(notaRepository).countByClienteIdAndOrigem(7L, "ADN");
    }

    @Test
    void status_naoExpoeConteudoCifrado() {
        ClienteCertificadoArquivo cert = new ClienteCertificadoArquivo();
        cert.setCliente(cliente);
        cert.setPfxCifrado(new byte[]{1, 2, 3});
        cert.setSenhaCifrada(new byte[]{4, 5});
        cert.setTitular("EMPRESA");
        when(certificadoRepository.findByClienteId(7L)).thenReturn(Optional.of(cert));

        NfseAdnStatusDTO dto = service.status(7L);

        assertThat(dto.certificado().titular()).isEqualTo("EMPRESA");
        assertThat(NfseAdnStatusDTO.Certificado.class.getRecordComponents())
                .extracting(java.lang.reflect.RecordComponent::getName)
                .doesNotContain("pfxCifrado", "senhaCifrada", "senha");
        verify(syncService, never()).sincronizar(any());
        verify(auditLogService, never()).registrar(anyString(), anyString(), anyString(), any(), any());
    }
}
