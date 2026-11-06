package br.com.someli.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ClienteAnotacaoSalvarRequest(
        @Size(max = 200, message = "Título muito longo")
        String titulo,
        @NotBlank(message = "Informe o texto")
        @Size(max = 8000, message = "Texto muito longo")
        String texto,
        @Pattern(regexp = "^$|FISCAL|DEPARTAMENTO_PESSOAL|CONTABIL|SOCIETARIO", message = "Setor inválido")
        String setor,
        Boolean fixada,
        @Pattern(regexp = "^$|MANUAL|TRELLO", message = "Origem inválida")
        String origem
) {
}
