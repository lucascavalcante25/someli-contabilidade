package br.com.someli.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/** API pública da CNPJ.ws: gratuita, sem chave, até 3 consultas por minuto. */
@Component
public class CnpjWsIntegration {

    private final RestTemplate restTemplate;

    @Value("${cnpjws.api.url}")
    private String cnpjWsApiUrl;

    public CnpjWsIntegration(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public JsonNode consultar(String cnpj) {
        return restTemplate.getForObject(cnpjWsApiUrl + cnpj, JsonNode.class);
    }
}
