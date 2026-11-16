package br.com.someli.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ProfissaoRequestDTO {

    @NotBlank(message = "Informe o nome da profissão")
    @Size(max = 80, message = "Nome muito longo")
    private String nome;

    @NotNull(message = "Informe o dia")
    @Min(value = 1, message = "Dia inválido")
    @Max(value = 31, message = "Dia inválido")
    private Integer dia;

    @NotNull(message = "Informe o mês")
    @Min(value = 1, message = "Mês inválido")
    @Max(value = 12, message = "Mês inválido")
    private Integer mes;

    @Size(max = 200, message = "Lista de CNAE muito longa")
    private String cnaePrefixos;

    private Boolean ativo;

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public Integer getDia() { return dia; }
    public void setDia(Integer dia) { this.dia = dia; }
    public Integer getMes() { return mes; }
    public void setMes(Integer mes) { this.mes = mes; }
    public String getCnaePrefixos() { return cnaePrefixos; }
    public void setCnaePrefixos(String cnaePrefixos) { this.cnaePrefixos = cnaePrefixos; }
    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean ativo) { this.ativo = ativo; }
}
