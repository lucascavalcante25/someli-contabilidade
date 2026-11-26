package br.com.someli.dto;

import br.com.someli.domain.RegimeRtc;
import com.fasterxml.jackson.databind.JsonNode;

/** Resultado da calculadora da Receita, sem alteração, com a versão que calculou. */
public record SimulacaoRtcResultadoDTO(
        RegimeRtc regime,
        String versaoCalculadora,
        String versaoBase,
        String avisoDadosSimulados,
        JsonNode resultado
) {
}
