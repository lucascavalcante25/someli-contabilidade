package br.com.someli.dto;

import br.com.someli.domain.RegimeRtc;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;

/**
 * Operação no formato da calculadora da Receita escolhida (montada pelo front em src/lib/simuladorRtc.ts).
 */
public record SimulacaoRtcCalcularRequest(
        @NotNull(message = "Escolha o regime") RegimeRtc regime,
        @NotNull(message = "Informe a operação") JsonNode operacao
) {
}
