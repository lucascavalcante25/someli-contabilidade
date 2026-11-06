package br.com.someli.dto;

import java.time.LocalDateTime;

/** Listagem: sem senha e sem observação. O login sai mascarado. */
public record ClienteAcessoResumoDTO(
        Long id,
        Long clienteId,
        String sistema,
        String url,
        String loginMascarado,
        String setor,
        String origem,
        String atualizadoPorNome,
        LocalDateTime atualizadoEm
) {
}
