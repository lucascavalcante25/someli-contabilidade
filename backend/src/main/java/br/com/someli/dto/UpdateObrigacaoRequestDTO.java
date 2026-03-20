package br.com.someli.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public class UpdateObrigacaoRequestDTO {

    @Size(max = 100)
    private String nome;

    @Size(max = 30)
    private String tipo;

    @Size(max = 500)
    private String descricao;

    @Min(value = 0, message = "Dias de antecedência deve ser >= 0")
    private Integer diasAntecedenciaAlerta;

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
