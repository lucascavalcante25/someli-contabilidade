package br.com.someli.service;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.InscricaoEstadualConsultaDTO;
import br.com.someli.exception.ExternalApiException;
import br.com.someli.integration.CnpjWsIntegration;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.util.ArrayList;
import java.util.List;

@Service
public class InscricaoEstadualService {

    private static final Logger LOGGER = LoggerFactory.getLogger(InscricaoEstadualService.class);

    private final CnpjWsIntegration cnpjWsIntegration;
    private final AuthorizationService authorizationService;

    public InscricaoEstadualService(CnpjWsIntegration cnpjWsIntegration,
                                    AuthorizationService authorizationService) {
        this.cnpjWsIntegration = cnpjWsIntegration;
        this.authorizationService = authorizationService;
    }

    public InscricaoEstadualConsultaDTO consultar(String cnpjInformado) {
        authorizationService.requirePermission(PermissaoCodigo.CONSULTAS_VISUALIZAR);
        String cnpj = cnpjInformado == null ? "" : cnpjInformado.replaceAll("\\D", "");
        if (cnpj.length() != 14) {
            throw new ExternalApiException(HttpStatus.BAD_REQUEST, "CNPJ inválido. Informe 14 dígitos numéricos.");
        }

        try {
            JsonNode resposta = cnpjWsIntegration.consultar(cnpj);
            if (resposta == null) {
                throw new ExternalApiException(HttpStatus.BAD_GATEWAY, "Resposta vazia da CNPJ.ws.");
            }
            return montar(cnpj, resposta);
        } catch (HttpClientErrorException.TooManyRequests ex) {
            throw new ExternalApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "A CNPJ.ws permite 3 consultas por minuto. Aguarde um minuto e tente novamente.");
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ExternalApiException(HttpStatus.NOT_FOUND, "CNPJ não encontrado na CNPJ.ws.");
        } catch (HttpClientErrorException | HttpServerErrorException ex) {
            LOGGER.error("Erro na CNPJ.ws: status {}", ex.getStatusCode(), ex);
            throw new ExternalApiException(HttpStatus.BAD_GATEWAY, "CNPJ.ws indisponível no momento.");
        } catch (ResourceAccessException ex) {
            LOGGER.error("Timeout na CNPJ.ws", ex);
            throw new ExternalApiException(HttpStatus.GATEWAY_TIMEOUT, "Tempo esgotado ao consultar a CNPJ.ws.");
        }
    }

    private InscricaoEstadualConsultaDTO montar(String cnpj, JsonNode resposta) {
        JsonNode simples = resposta.path("simples");
        JsonNode estabelecimento = resposta.path("estabelecimento");

        List<InscricaoEstadualConsultaDTO.Inscricao> inscricoes = new ArrayList<>();
        for (JsonNode item : estabelecimento.path("inscricoes_estaduais")) {
            inscricoes.add(new InscricaoEstadualConsultaDTO.Inscricao(
                    texto(item, "inscricao_estadual"),
                    item.path("ativo").asBoolean(false),
                    texto(item.path("estado"), "sigla"),
                    texto(item, "atualizado_em")));
        }

        return new InscricaoEstadualConsultaDTO(
                cnpj,
                texto(resposta, "razao_social"),
                texto(estabelecimento, "situacao_cadastral"),
                "Sim".equalsIgnoreCase(texto(simples, "simples")),
                texto(simples, "data_opcao_simples"),
                texto(simples, "data_exclusao_simples"),
                "Sim".equalsIgnoreCase(texto(simples, "mei")),
                texto(simples, "data_opcao_mei"),
                texto(simples, "data_exclusao_mei"),
                texto(simples, "atualizado_em"),
                inscricoes);
    }

    private String texto(JsonNode no, String campo) {
        JsonNode valor = no.path(campo);
        return valor.isMissingNode() || valor.isNull() ? null : valor.asText();
    }
}
