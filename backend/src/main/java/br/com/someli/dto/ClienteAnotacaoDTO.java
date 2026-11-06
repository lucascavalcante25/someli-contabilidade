package br.com.someli.dto;

import java.time.LocalDateTime;

public record ClienteAnotacaoDTO(
        Long id,
        Long clienteId,
        String titulo,
        String texto,
        String setor,
        boolean fixada,
        String origem,
        String atualizadoPorNome,
        LocalDateTime atualizadoEm
) {
}
