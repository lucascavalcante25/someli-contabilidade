package br.com.someli.dto;

import java.time.LocalDateTime;

/**
 * Acesso já decifrado, para a ficha do cliente abrir mostrando tudo (como era no Trello).
 * Só sai por GET /clientes/{id}/acessos/abertos, com permissão, alçada, auditoria e sem cache.
 */
public record ClienteAcessoAbertoDTO(
        Long id,
        Long clienteId,
        String sistema,
        String url,
        String login,
        String senha,
        String observacao,
        String setor,
        String origem,
        String atualizadoPorNome,
        LocalDateTime atualizadoEm
) {
}
