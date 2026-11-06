package br.com.someli.dto;

/** Projeção leve (sem colunas cifradas) para contar a ficha. */
public record FichaItemSetor(Long clienteId, String setor) {
}
