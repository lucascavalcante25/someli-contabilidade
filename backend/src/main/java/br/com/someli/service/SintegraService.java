package br.com.someli.service;

import br.com.someli.dto.SintegraDTO;
import br.com.someli.dto.SintegraRequestDTO;
import br.com.someli.exception.ExternalApiException;
import br.com.someli.integration.SintegraIntegration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.util.HashMap;
import java.util.Map;

@Service
public class SintegraService {

    private static final Logger LOGGER = LoggerFactory.getLogger(SintegraService.class);

    private final SintegraIntegration sintegraIntegration;

    @Value("${infosimples.token}")
    private String infosimplesToken;

    public SintegraService(SintegraIntegration sintegraIntegration) {
        this.sintegraIntegration = sintegraIntegration;
    }

    public SintegraDTO consultarSintegra(SintegraRequestDTO request) {
        if (request == null) {
            throw new ExternalApiException(HttpStatus.BAD_REQUEST, "Payload da consulta SINTEGRA é obrigatório.");
        }
        if (request.getUf() == null || request.getUf().isBlank()) {
            throw new ExternalApiException(HttpStatus.BAD_REQUEST, "UF é obrigatória para a consulta SINTEGRA.");
        }

        String cnpj = normalizarNumerico(request.getCnpj());
        String cpf = normalizarNumerico(request.getCpf());

        if ((cnpj == null || cnpj.isBlank()) &&
                (request.getIe() == null || request.getIe().isBlank()) &&
                (request.getIeProdutor() == null || request.getIeProdutor().isBlank()) &&
                (cpf == null || cpf.isBlank())) {
            throw new ExternalApiException(HttpStatus.BAD_REQUEST, "Informe ao menos um identificador: cnpj, ie, ieProdutor ou cpf.");
        }

        Map<String, String> payload = new HashMap<>();
        payload.put("token", infosimplesToken);
        payload.put("uf", request.getUf().trim().toUpperCase());

        if (cnpj != null && !cnpj.isBlank()) {
            payload.put("cnpj", cnpj);
        }
        if (request.getIe() != null && !request.getIe().isBlank()) {
            payload.put("ie", request.getIe().trim());
        }
        if (request.getIeProdutor() != null && !request.getIeProdutor().isBlank()) {
            payload.put("ie_produtor", request.getIeProdutor().trim());
        }
        if (cpf != null && !cpf.isBlank()) {
            payload.put("cpf", cpf);
        }

        try {
            LOGGER.info("Consulta SINTEGRA iniciada para UF={} CNPJ={}", request.getUf(), cnpj);
            SintegraDTO response = sintegraIntegration.consultar(payload);
            if (response == null) {
                throw new ExternalApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Resposta vazia da API SINTEGRA.");
            }
            LOGGER.info("Consulta SINTEGRA sucesso para UF={} CNPJ={}", request.getUf(), cnpj);
            return response;
        } catch (HttpClientErrorException.TooManyRequests ex) {
            LOGGER.error("Rate limit na API SINTEGRA para CNPJ {}", cnpj, ex);
            throw new ExternalApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Rate limit da API SINTEGRA. Tente novamente em instantes.");
        } catch (HttpClientErrorException.BadRequest ex) {
            LOGGER.error("Erro de validação na API SINTEGRA para CNPJ {}", cnpj, ex);
            throw new ExternalApiException(HttpStatus.BAD_REQUEST, "Dados inválidos para consulta SINTEGRA.");
        } catch (HttpClientErrorException ex) {
            LOGGER.error("Erro cliente na API SINTEGRA para CNPJ {}", cnpj, ex);
            throw new ExternalApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro na API SINTEGRA.");
        } catch (HttpServerErrorException ex) {
            LOGGER.error("Erro servidor na API SINTEGRA para CNPJ {}", cnpj, ex);
            throw new ExternalApiException(HttpStatus.INTERNAL_SERVER_ERROR, "API SINTEGRA indisponível no momento.");
        } catch (ResourceAccessException ex) {
            LOGGER.error("Timeout na API SINTEGRA para CNPJ {}", cnpj, ex);
            throw new ExternalApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Timeout ao consultar API SINTEGRA.");
        }
    }

    private String normalizarNumerico(String value) {
        if (value == null) {
            return null;
        }
        return value.replaceAll("\\D", "");
    }
}
