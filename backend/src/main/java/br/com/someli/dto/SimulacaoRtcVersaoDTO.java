package br.com.someli.dto;

import br.com.someli.domain.RegimeRtc;
import com.fasterxml.jackson.databind.JsonNode;

/** Versão instalada de cada calculadora; detalhes é o JSON do endpoint de versão da própria calculadora. */
public record SimulacaoRtcVersaoDTO(
        RegimeRtc regime,
        boolean disponivel,
        JsonNode detalhes,
        String mensagem
) {
}
