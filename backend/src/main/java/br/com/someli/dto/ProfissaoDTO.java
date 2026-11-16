package br.com.someli.dto;

/** Profissão com o dia comemorativo e os prefixos de CNAE que sugerem ela no cadastro. */
public record ProfissaoDTO(Long id, String nome, Integer dia, Integer mes, String cnaePrefixos, Boolean ativo) {
}
