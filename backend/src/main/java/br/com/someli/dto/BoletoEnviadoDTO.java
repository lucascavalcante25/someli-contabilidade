package br.com.someli.dto;

import java.time.LocalDateTime;

/** Situação do envio do boleto de um cliente num mês. */
public record BoletoEnviadoDTO(Long clienteId, int mes, int ano, boolean enviado,
                               LocalDateTime enviadoEm, String enviadoPor) {
}
