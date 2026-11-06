package br.com.someli.dto;

/** Resposta de revelar. Não entra em listagem nem em cache. */
public record ClienteAcessoReveladoDTO(
        Long id,
        String login,
        String senha,
        String observacao
) {
}
