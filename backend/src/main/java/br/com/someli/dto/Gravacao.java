package br.com.someli.dto;

/** Resultado interno de criar: o controller escolhe 201 ou 200. Não vai para o JSON. */
public record Gravacao<T>(T corpo, boolean criado) {
}
