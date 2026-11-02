package br.com.someli.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class CreateSolicitacaoDocumentoDTO {

    @NotBlank(message = "Informe o que deve ser enviado")
    @Size(max = 200, message = "Título deve ter até 200 caracteres")
    private String titulo;

    @Size(max = 500, message = "Orientação deve ter até 500 caracteres")
    private String descricao;

    @Pattern(regexp = "^$|\\d{4}-\\d{2}", message = "Competência deve estar no formato YYYY-MM")
    private String competencia;

    private Integer diasValidade;

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public String getCompetencia() { return competencia; }
    public void setCompetencia(String competencia) { this.competencia = competencia; }
    public Integer getDiasValidade() { return diasValidade; }
    public void setDiasValidade(Integer diasValidade) { this.diasValidade = diasValidade; }
}
