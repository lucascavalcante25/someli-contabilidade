package br.com.someli.integration;

import br.com.someli.domain.RegimeRtc;
import br.com.someli.exception.ExternalApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

/**
 * Camada de integração com as calculadoras oficiais da Receita Federal (licença MIT):
 * github.com/ReceitaFederal/calculadora-rtc-regime-regular e calculadora-rtc-simples-nacional.
 *
 * <p>Não recalcula nem altera nada: envia a operação como a calculadora espera e devolve o corpo
 * da resposta como veio. O que este cliente acrescenta é só a tradução de erro (rede x validação)
 * e a leitura da versão nos cabeçalhos.
 *
 * <p>Usa sempre os endpoints de observabilidade, que respondem 200 com o erro de cada item em vez de
 * recusar a operação inteira no primeiro erro. No Simples Nacional usa o "não assistido", que recebe as
 * alíquotas efetivas por anexo e aceita NF-e e NFS-e no mesmo contrato.
 */
@Component
public class CalculadoraRtcClient {

    private static final Logger log = LoggerFactory.getLogger(CalculadoraRtcClient.class);

    static final String CALCULO_REGIME_REGULAR = "/calculadora/observabilidade/regime-geral";
    static final String CALCULO_SIMPLES = "/calculadora/observabilidade/simples-nacional/nao-assistido";
    static final String VERSAO_REGIME_REGULAR = "/calculadora/dados-abertos/versao";
    static final String VERSAO_SIMPLES = "/versao";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String urlRegimeRegular;
    private final String urlSimples;

    @Autowired
    public CalculadoraRtcClient(RestTemplate restTemplate,
                                ObjectMapper objectMapper,
                                @Value("${rtc.regime-regular.url}") String urlRegimeRegular,
                                @Value("${rtc.simples-nacional.url}") String urlSimples) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.urlRegimeRegular = semBarraFinal(urlRegimeRegular);
        this.urlSimples = semBarraFinal(urlSimples);
    }

    public RespostaRtc calcular(RegimeRtc regime, JsonNode operacao) {
        String url = base(regime) + (regime == RegimeRtc.SIMPLES_NACIONAL ? CALCULO_SIMPLES : CALCULO_REGIME_REGULAR);
        HttpHeaders cabecalhos = new HttpHeaders();
        cabecalhos.setContentType(MediaType.APPLICATION_JSON);
        cabecalhos.setAccept(List.of(MediaType.APPLICATION_JSON, MediaType.APPLICATION_PROBLEM_JSON));
        ResponseEntity<JsonNode> resposta = trocar(regime, url, HttpMethod.POST, new HttpEntity<>(operacao, cabecalhos));
        HttpHeaders h = resposta.getHeaders();
        return new RespostaRtc(
                resposta.getBody(),
                h.getFirst("X-CALC-APP-VERSION"),
                h.getFirst("X-CALC-DB-VERSION"),
                h.getFirst("x-warning-dados-simulados"));
    }

    public JsonNode versao(RegimeRtc regime) {
        String url = base(regime) + (regime == RegimeRtc.SIMPLES_NACIONAL ? VERSAO_SIMPLES : VERSAO_REGIME_REGULAR);
        return trocar(regime, url, HttpMethod.GET, HttpEntity.EMPTY).getBody();
    }

    private ResponseEntity<JsonNode> trocar(RegimeRtc regime, String url, HttpMethod metodo, HttpEntity<?> corpo) {
        try {
            return restTemplate.exchange(url, metodo, corpo, JsonNode.class);
        } catch (ResourceAccessException e) {
            // Só o tipo do erro vai para o log: a operação pode ter dados do cliente.
            log.warn("Calculadora RTC {} sem resposta: {}", regime, e.getClass().getSimpleName());
            throw new ExternalApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Calculadora da Receita indisponível no momento. Tente de novo em instantes.");
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().is4xxClientError()) {
                throw new ExternalApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "A calculadora da Receita recusou a operação: " + detalhe(e.getResponseBodyAsString()));
            }
            log.warn("Calculadora RTC {} respondeu {}", regime, e.getStatusCode().value());
            throw new ExternalApiException(HttpStatus.BAD_GATEWAY,
                    "A calculadora da Receita falhou ao calcular. Tente de novo ou confira a versão instalada.");
        } catch (RestClientException e) {
            log.warn("Calculadora RTC {} com resposta ilegível: {}", regime, e.getClass().getSimpleName());
            throw new ExternalApiException(HttpStatus.BAD_GATEWAY, "Resposta inesperada da calculadora da Receita.");
        }
    }

    /** Extrai detail/title do problem+json; nunca devolve corpo cru (pode ter rastro interno). */
    private String detalhe(String corpo) {
        try {
            JsonNode problema = objectMapper.readTree(corpo);
            for (String campo : List.of("detail", "title")) {
                JsonNode valor = problema == null ? null : problema.get(campo);
                if (valor != null && valor.isTextual() && !valor.asText().isBlank()) {
                    return limitar(valor.asText());
                }
            }
        } catch (Exception ignorado) {
            // corpo não é JSON
        }
        return "dados inválidos.";
    }

    private static String limitar(String texto) {
        return texto.length() > 500 ? texto.substring(0, 500) + "…" : texto;
    }

    private String base(RegimeRtc regime) {
        return regime == RegimeRtc.SIMPLES_NACIONAL ? urlSimples : urlRegimeRegular;
    }

    private static String semBarraFinal(String url) {
        return url != null && url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
