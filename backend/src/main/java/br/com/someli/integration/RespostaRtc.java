package br.com.someli.integration;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Resposta da calculadora da Receita, sem alteração no corpo.
 * As versões vêm dos cabeçalhos X-CALC-APP-VERSION e X-CALC-DB-VERSION da própria resposta,
 * para o resultado salvo ficar ligado à versão que o calculou.
 */
public record RespostaRtc(
        JsonNode corpo,
        String versaoCalculadora,
        String versaoBase,
        String avisoDadosSimulados
) {
}
