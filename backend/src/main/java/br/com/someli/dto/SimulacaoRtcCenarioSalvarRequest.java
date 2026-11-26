package br.com.someli.dto;

import br.com.someli.domain.RegimeRtc;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** O resultado não vem do front: o servidor recalcula na calculadora ao salvar. */
public record SimulacaoRtcCenarioSalvarRequest(
        @NotBlank(message = "Dê um nome ao cenário") @Size(max = 120, message = "Nome com até 120 caracteres") String nome,
        @NotNull(message = "Escolha o regime") RegimeRtc regime,
        @NotNull(message = "Informe a operação") JsonNode operacao,
        @Size(max = 1000, message = "Observação com até 1000 caracteres") String observacao
) {
}
