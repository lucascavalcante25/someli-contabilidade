package br.com.someli.dto;

/** Contagem para o ícone do painel. Não traz senha, login nem texto. */
public record FichaContagemDTO(Long clienteId, int acessos, int anotacoes) {
}
