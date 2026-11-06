package br.com.someli.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ClienteAcessoAtualizarRequest(
        @NotBlank(message = "Informe o sistema")
        @Size(max = 120, message = "Sistema muito longo")
        String sistema,
        @Size(max = 500, message = "URL muito longa")
        String url,
        @NotBlank(message = "Informe o login")
        @Size(max = 300, message = "Login muito longo")
        String login,
        /** Em branco mantém a senha já guardada. */
        @Size(max = 500, message = "Senha muito longa")
        String senha,
        @Size(max = 2000, message = "Observação muito longa")
        String observacao,
        @Pattern(regexp = "^$|FISCAL|DEPARTAMENTO_PESSOAL|CONTABIL|SOCIETARIO", message = "Setor inválido")
        String setor
) {
}
