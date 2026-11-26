package br.com.someli.integration;

import br.com.someli.domain.RegimeRtc;
import br.com.someli.exception.ExternalApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class CalculadoraRtcClientTest {

    private static final String RR = "http://rtc-rr.test/api";
    private static final String SN = "http://rtc-sn.test/api";

    private final ObjectMapper mapper = new ObjectMapper();
    private MockRestServiceServer servidor;
    private CalculadoraRtcClient client;

    @BeforeEach
    void setUp() {
        RestTemplate rest = new RestTemplate();
        servidor = MockRestServiceServer.bindTo(rest).build();
        client = new CalculadoraRtcClient(rest, mapper, RR, SN);
    }

    @Test
    void regimeRegular_usaObservabilidade_eLeVersaoDosCabecalhos() throws IOException {
        HttpHeaders cabecalhos = new HttpHeaders();
        cabecalhos.add("X-CALC-APP-VERSION", "1.7.2");
        cabecalhos.add("X-CALC-DB-VERSION", "V0073");
        cabecalhos.add("x-warning-dados-simulados", "6");
        servidor.expect(requestTo(RR + "/calculadora/observabilidade/regime-geral"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().json("{\"id\":\"sim-1\"}"))
                .andRespond(withSuccess("{\"objetos\":[]}", MediaType.APPLICATION_JSON).headers(cabecalhos));

        RespostaRtc resposta = client.calcular(RegimeRtc.REGIME_REGULAR, json("{\"id\":\"sim-1\"}"));

        assertThat(resposta.corpo().has("objetos")).isTrue();
        assertThat(resposta.versaoCalculadora()).isEqualTo("1.7.2");
        assertThat(resposta.versaoBase()).isEqualTo("V0073");
        assertThat(resposta.avisoDadosSimulados()).isEqualTo("6");
        servidor.verify();
    }

    @Test
    void simples_usaEndpointNaoAssistido() throws IOException {
        servidor.expect(requestTo(SN + "/calculadora/observabilidade/simples-nacional/nao-assistido"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"objetos\":[]}", MediaType.APPLICATION_JSON));

        RespostaRtc resposta = client.calcular(RegimeRtc.SIMPLES_NACIONAL, json("{\"id\":\"sim-2\"}"));

        assertThat(resposta.versaoCalculadora()).isNull();
        servidor.verify();
    }

    @Test
    void calculadoraForaDoAr_viraErroDeRede503() throws IOException {
        RestTemplate rest = new RestTemplate();
        CalculadoraRtcClient semServidor = new CalculadoraRtcClient(rest, mapper, "http://127.0.0.1:1/api", SN);

        assertThatThrownBy(() -> semServidor.calcular(RegimeRtc.REGIME_REGULAR, json("{}")))
                .isInstanceOf(ExternalApiException.class)
                .hasMessageContaining("indisponível")
                .extracting(e -> ((ExternalApiException) e).getStatus())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    void erro422DaCalculadora_repassaODetalhe() throws IOException {
        servidor.expect(requestTo(RR + "/calculadora/observabilidade/regime-geral"))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                        .body("{\"title\":\"Erro de validação\",\"detail\":\"Município não encontrado\"}"));

        assertThatThrownBy(() -> client.calcular(RegimeRtc.REGIME_REGULAR, json("{}")))
                .isInstanceOf(ExternalApiException.class)
                .hasMessageContaining("Município não encontrado")
                .extracting(e -> ((ExternalApiException) e).getStatus())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void erro500DaCalculadora_vira502SemVazarCorpo() throws IOException {
        servidor.expect(requestTo(RR + "/calculadora/observabilidade/regime-geral"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("stacktrace interno"));

        assertThatThrownBy(() -> client.calcular(RegimeRtc.REGIME_REGULAR, json("{}")))
                .isInstanceOf(ExternalApiException.class)
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain("stacktrace"))
                .extracting(e -> ((ExternalApiException) e).getStatus())
                .isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void versao_consultaOEndpointDeCadaCalculadora() {
        servidor.expect(requestTo(RR + "/calculadora/dados-abertos/versao"))
                .andRespond(withSuccess("{\"versaoApp\":\"1.7.2\"}", MediaType.APPLICATION_JSON));
        servidor.expect(requestTo(SN + "/versao"))
                .andRespond(withSuccess("{\"versaoAplicacao\":\"1.0.2\"}", MediaType.APPLICATION_JSON));

        assertThat(client.versao(RegimeRtc.REGIME_REGULAR).get("versaoApp").asText()).isEqualTo("1.7.2");
        assertThat(client.versao(RegimeRtc.SIMPLES_NACIONAL).get("versaoAplicacao").asText()).isEqualTo("1.0.2");
        servidor.verify();
    }

    private JsonNode json(String texto) throws IOException {
        return mapper.readTree(texto);
    }
}
