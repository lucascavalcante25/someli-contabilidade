package br.com.someli.integration;

import br.com.someli.dto.CnpjResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class ReceitaWsIntegration {

    private final RestTemplate restTemplate;

    @Value("${receitaws.api.url}")
    private String receitaWsApiUrl;

    public ReceitaWsIntegration(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public CnpjResponseDTO consultar(String cnpj) {
        ResponseEntity<CnpjResponseDTO> response = restTemplate.getForEntity(receitaWsApiUrl + cnpj, CnpjResponseDTO.class);
        return response.getBody();
    }
}
