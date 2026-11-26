package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.RegimeRtc;
import br.com.someli.domain.SimulacaoRtcCenario;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.SimulacaoRtcCalcularRequest;
import br.com.someli.dto.SimulacaoRtcCenarioDTO;
import br.com.someli.dto.SimulacaoRtcCenarioSalvarRequest;
import br.com.someli.dto.SimulacaoRtcResultadoDTO;
import br.com.someli.dto.SimulacaoRtcVersaoDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.ExternalApiException;
import br.com.someli.exception.SimulacaoRtcCenarioNaoEncontradoException;
import br.com.someli.integration.CalculadoraRtcClient;
import br.com.someli.integration.RespostaRtc;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.SimulacaoRtcCenarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SimuladorRtcServiceTest {

    @Mock private CalculadoraRtcClient client;
    @Mock private SimulacaoRtcCenarioRepository cenarioRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private AuditLogService auditLogService;

    private final ObjectMapper mapper = new ObjectMapper();
    private SimuladorRtcService service;
    private Cliente cliente;

    @BeforeEach
    void setUp() {
        service = new SimuladorRtcService(client, cenarioRepository, clienteRepository,
                authorizationService, auditLogService, mapper);
        cliente = new Cliente();
        cliente.setId(7L);
        Usuario usuario = new Usuario();
        usuario.setId(3L);
        usuario.setNome("Ana Teste");
        lenient().when(authorizationService.currentUser()).thenReturn(usuario);
    }

    // ---------- calcular ----------

    @Test
    void calcular_semPermissao_naoChamaACalculadora() throws Exception {
        doThrow(new AcessoNegadoException("Sem permissão: SIMULADOR_RTC_USAR"))
                .when(authorizationService).requirePermission(PermissaoCodigo.SIMULADOR_RTC_USAR);

        assertThatThrownBy(() -> service.calcular(pedido(RegimeRtc.REGIME_REGULAR, operacaoValida())))
                .isInstanceOf(AcessoNegadoException.class);
        verifyNoInteractions(client);
    }

    @Test
    void calcular_devolveCorpoSemAlteracaoComVersao() throws Exception {
        JsonNode corpo = json("{\"objetos\":[{\"nObj\":1,\"estadoItem\":\"CALCULADO\"}]}");
        when(client.calcular(eq(RegimeRtc.REGIME_REGULAR), any()))
                .thenReturn(new RespostaRtc(corpo, "1.7.2", "V0073", null));

        SimulacaoRtcResultadoDTO r = service.calcular(pedido(RegimeRtc.REGIME_REGULAR, operacaoValida()));

        assertThat(r.resultado()).isEqualTo(corpo);
        assertThat(r.versaoCalculadora()).isEqualTo("1.7.2");
        assertThat(r.versaoBase()).isEqualTo("V0073");
        assertThat(r.regime()).isEqualTo(RegimeRtc.REGIME_REGULAR);
    }

    @Test
    void calcular_semItens_recusaAntesDeChamar() throws Exception {
        assertThatThrownBy(() -> service.calcular(pedido(RegimeRtc.REGIME_REGULAR, json("{\"id\":\"x\",\"itens\":[]}"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("item");
        verifyNoInteractions(client);
    }

    @Test
    void calcular_comMuitosItens_recusa() throws Exception {
        StringBuilder itens = new StringBuilder();
        for (int i = 1; i <= 51; i++) itens.append(i > 1 ? "," : "").append("{\"numero\":").append(i).append('}');
        JsonNode op = json("{\"id\":\"x\",\"itens\":[" + itens + "]}");
        assertThatThrownBy(() -> service.calcular(pedido(RegimeRtc.REGIME_REGULAR, op)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("50");
        verifyNoInteractions(client);
    }

    // ---------- versões ----------

    @Test
    void versoes_marcaIndisponivelQuandoACalculadoraNaoResponde() throws Exception {
        when(client.versao(RegimeRtc.REGIME_REGULAR)).thenReturn(json("{\"versaoApp\":\"1.7.2\"}"));
        when(client.versao(RegimeRtc.SIMPLES_NACIONAL))
                .thenThrow(new ExternalApiException(HttpStatus.SERVICE_UNAVAILABLE, "indisponível"));

        List<SimulacaoRtcVersaoDTO> versoes = service.versoes();

        assertThat(versoes).hasSize(2);
        assertThat(versoes.get(0).disponivel()).isTrue();
        assertThat(versoes.get(0).detalhes().get("versaoApp").asText()).isEqualTo("1.7.2");
        assertThat(versoes.get(1).disponivel()).isFalse();
    }

    @Test
    void versoes_semPermissao_negado() {
        doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.SIMULADOR_RTC_USAR);
        assertThatThrownBy(() -> service.versoes()).isInstanceOf(AcessoNegadoException.class);
        verifyNoInteractions(client);
    }

    // ---------- cenários ----------

    @Test
    void listar_semAlcada_naoConsulta() {
        doThrow(new AcessoNegadoException("Sem alçada sobre este cliente"))
                .when(authorizationService).requireCompanyAccess(7L);
        assertThatThrownBy(() -> service.listarCenarios(7L)).isInstanceOf(AcessoNegadoException.class);
        verify(cenarioRepository, never()).findAtivosByClienteId(any());
    }

    @Test
    void salvar_recalculaNaCalculadoraEGuardaVersaoDaResposta() throws Exception {
        when(clienteRepository.findById(7L)).thenReturn(Optional.of(cliente));
        JsonNode corpo = json("{\"objetos\":[]}");
        when(client.calcular(eq(RegimeRtc.SIMPLES_NACIONAL), any()))
                .thenReturn(new RespostaRtc(corpo, "1.0.2", "V0073", null));
        when(cenarioRepository.save(any())).thenAnswer(inv -> {
            SimulacaoRtcCenario c = inv.getArgument(0);
            c.setId(55L);
            return c;
        });

        SimulacaoRtcCenarioDTO dto = service.salvarCenario(7L, new SimulacaoRtcCenarioSalvarRequest(
                "  Venda balcão 2027  ", RegimeRtc.SIMPLES_NACIONAL, operacaoValida(), "obs"));

        ArgumentCaptor<SimulacaoRtcCenario> salvo = ArgumentCaptor.forClass(SimulacaoRtcCenario.class);
        verify(cenarioRepository).save(salvo.capture());
        assertThat(salvo.getValue().getNome()).isEqualTo("Venda balcão 2027");
        assertThat(salvo.getValue().getVersaoCalculadora()).isEqualTo("1.0.2");
        assertThat(salvo.getValue().getResultado()).isEqualTo("{\"objetos\":[]}");
        assertThat(salvo.getValue().getCriadoPor().getId()).isEqualTo(3L);
        assertThat(dto.id()).isEqualTo(55L);
        assertThat(dto.regime()).isEqualTo(RegimeRtc.SIMPLES_NACIONAL);
        verify(auditLogService).registrar(eq("SIMULACAO_RTC_SALVAR"), eq("CLIENTE"), eq("7"), any(), anyString());
    }

    @Test
    void salvar_semAlcada_naoCalculaNemGrava() throws Exception {
        doThrow(new AcessoNegadoException("Sem alçada sobre este cliente"))
                .when(authorizationService).requireCompanyAccess(7L);
        assertThatThrownBy(() -> service.salvarCenario(7L, new SimulacaoRtcCenarioSalvarRequest(
                "x", RegimeRtc.REGIME_REGULAR, operacaoValida(), null)))
                .isInstanceOf(AcessoNegadoException.class);
        verifyNoInteractions(client);
        verify(cenarioRepository, never()).save(any());
    }

    @Test
    void obter_cenarioDeOutroCliente_validaAlcadaDoDono() {
        SimulacaoRtcCenario c = cenario(40L, 8L);
        when(cenarioRepository.findDetalheById(40L)).thenReturn(Optional.of(c));
        doThrow(new AcessoNegadoException("Sem alçada sobre este cliente"))
                .when(authorizationService).requireCompanyAccess(8L);

        assertThatThrownBy(() -> service.obterCenario(40L)).isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void excluir_desativaEAudita() {
        SimulacaoRtcCenario c = cenario(40L, 7L);
        when(cenarioRepository.findDetalheById(40L)).thenReturn(Optional.of(c));

        service.excluirCenario(40L);

        assertThat(c.isAtivo()).isFalse();
        verify(cenarioRepository).save(c);
        verify(auditLogService).registrar(eq("SIMULACAO_RTC_EXCLUIR"), eq("CLIENTE"), eq("7"), any(), anyString());
    }

    @Test
    void obter_cenarioExcluido_404() {
        SimulacaoRtcCenario c = cenario(40L, 7L);
        c.setAtivo(false);
        when(cenarioRepository.findDetalheById(40L)).thenReturn(Optional.of(c));
        assertThatThrownBy(() -> service.obterCenario(40L))
                .isInstanceOf(SimulacaoRtcCenarioNaoEncontradoException.class);
    }

    private SimulacaoRtcCenario cenario(Long id, Long clienteId) {
        Cliente dono = new Cliente();
        dono.setId(clienteId);
        SimulacaoRtcCenario c = new SimulacaoRtcCenario();
        c.setId(id);
        c.setCliente(dono);
        c.setNome("Cenário teste");
        c.setRegime(RegimeRtc.REGIME_REGULAR);
        c.setEntrada("{\"id\":\"a\",\"itens\":[{\"numero\":1}]}");
        c.setResultado("{\"objetos\":[]}");
        c.setAtivo(true);
        return c;
    }

    private SimulacaoRtcCalcularRequest pedido(RegimeRtc regime, JsonNode operacao) {
        return new SimulacaoRtcCalcularRequest(regime, operacao);
    }

    private JsonNode operacaoValida() throws Exception {
        return json("{\"id\":\"sim-1\",\"versao\":\"1.0.0\",\"itens\":[{\"numero\":1}]}");
    }

    private JsonNode json(String texto) throws Exception {
        return mapper.readTree(texto);
    }
}
