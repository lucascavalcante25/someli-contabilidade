package br.com.someli.integration;

import br.com.someli.dto.SintegraDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class SintegraIntegration {

    private final RestTemplate restTemplate;

    @Value("${infosimples.api.url}")
    private String infosimplesUrl;

    public SintegraIntegration(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public SintegraDTO consultar(Map<String, String> payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(payload, headers);
        ResponseEntity<SintegraDTO> response = restTemplate.postForEntity(infosimplesUrl, requestEntity, SintegraDTO.class);
        return response.getBody();
    }
}
