package br.com.someli.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateObrigacaoRequestDTO {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 100)
    private String nome;

    @NotBlank(message = "Tipo é obrigatório")
    @Size(max = 30)
    private String tipo;

    @Size(max = 500)
    private String descricao;

    @NotNull(message = "Dias de antecedência do alerta é obrigatório")
    @Min(value = 0, message = "Dias de antecedência deve ser >= 0")
    private Integer diasAntecedenciaAlerta = 7;

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public Integer getDiasAntecedenciaAlerta() {
        return diasAntecedenciaAlerta;
    }

    public void setDiasAntecedenciaAlerta(Integer diasAntecedenciaAlerta) {
        this.diasAntecedenciaAlerta = diasAntecedenciaAlerta;
    }
}
