package br.com.someli.dto;

import java.time.LocalDateTime;

/** {@code token} só vem preenchido na criação: depois disso o sistema guarda apenas o hash. */
public record SolicitacaoDocumentoDTO(
        Long id,
        Long clienteId,
        String titulo,
        String descricao,
        String competencia,
        String status,
        boolean expirada,
        LocalDateTime expiraEm,
        LocalDateTime criadoEm,
        LocalDateTime recebidoEm,
        int arquivosRecebidos,
        String token
) {
}
