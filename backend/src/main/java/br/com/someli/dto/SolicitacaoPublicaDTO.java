package br.com.someli.dto;

import java.time.LocalDateTime;

/** O que o cliente vê sem login: nada além do próprio pedido. */
public record SolicitacaoPublicaDTO(
        String empresa,
        String titulo,
        String descricao,
        String competencia,
        LocalDateTime expiraEm,
        int arquivosRecebidos,
        int arquivosRestantes
) {
}
