package br.com.someli.service;

import br.com.someli.dto.CnpjResponseDTO;
import br.com.someli.exception.ExternalApiException;
import br.com.someli.integration.ReceitaWsIntegration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

@Service
public class CnpjService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CnpjService.class);

    private final ReceitaWsIntegration receitaWsIntegration;

    public CnpjService(ReceitaWsIntegration receitaWsIntegration) {
        this.receitaWsIntegration = receitaWsIntegration;
    }

    public CnpjResponseDTO consultarCnpj(String cnpj) {
        if (cnpj == null || !cnpj.matches("\\d{14}")) {
            throw new ExternalApiException(HttpStatus.BAD_REQUEST, "CNPJ inválido. Informe 14 dígitos numéricos.");
        }

        try {
            LOGGER.info("Consulta CNPJ iniciada para {}", cnpj);
            CnpjResponseDTO response = receitaWsIntegration.consultar(cnpj);
            if (response == null) {
                throw new ExternalApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Resposta vazia da API ReceitaWS.");
            }
            if (response.getStatus() != null && response.getStatus().equalsIgnoreCase("ERROR")) {
                throw new ExternalApiException(HttpStatus.BAD_REQUEST, "CNPJ não encontrado ou inválido na ReceitaWS.");
            }
            LOGGER.info("Consulta CNPJ sucesso para {}", cnpj);
            return response;
        } catch (HttpClientErrorException.TooManyRequests ex) {
            LOGGER.error("Rate limit na API ReceitaWS para CNPJ {}", cnpj, ex);
            throw new ExternalApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Rate limit da API ReceitaWS. Tente novamente em instantes.");
        } catch (HttpClientErrorException.BadRequest ex) {
            LOGGER.error("Erro de CNPJ inválido na ReceitaWS para {}", cnpj, ex);
            throw new ExternalApiException(HttpStatus.BAD_REQUEST, "CNPJ inválido para consulta na ReceitaWS.");
        } catch (HttpClientErrorException ex) {
            LOGGER.error("Erro cliente na API ReceitaWS para {}", cnpj, ex);
            throw new ExternalApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro na API ReceitaWS.");
        } catch (HttpServerErrorException ex) {
            LOGGER.error("Erro servidor na API ReceitaWS para {}", cnpj, ex);
            throw new ExternalApiException(HttpStatus.INTERNAL_SERVER_ERROR, "API ReceitaWS indisponível no momento.");
        } catch (ResourceAccessException ex) {
            LOGGER.error("Timeout na API ReceitaWS para {}", cnpj, ex);
            throw new ExternalApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Timeout ao consultar API ReceitaWS.");
        }
    }
}
