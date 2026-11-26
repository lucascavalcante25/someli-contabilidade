package br.com.someli.dto;

import br.com.someli.domain.RegimeRtc;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;

public record SimulacaoRtcCenarioDTO(
        Long id,
        Long clienteId,
        String nome,
        RegimeRtc regime,
        String observacao,
        JsonNode operacao,
        JsonNode resultado,
        String versaoCalculadora,
        String versaoBase,
        String avisoDadosSimulados,
        String criadoPor,
        LocalDateTime criadoEm
) {
}
