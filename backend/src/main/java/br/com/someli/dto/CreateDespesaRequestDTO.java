package br.com.someli.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class CreateDespesaRequestDTO {

    @NotBlank(message = "Descrição é obrigatória")
    @Size(max = 255)
    private String descricao;

    @NotNull(message = "Valor mensal é obrigatório")
    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal valorMensal;

    @NotBlank(message = "Tipo é obrigatório")
    @Size(max = 30)
    private String tipo;

    @NotNull(message = "Dia de pagamento é obrigatório")
    @Min(1) @Max(31)
    private Integer diaPagamento = 10;

    @NotNull(message = "Data de início é obrigatória")
    private LocalDate dataInicio;

    private Integer parcelas;
    private Integer parcelaAtual = 1;
    private LocalDate dataInicioCobranca;

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public BigDecimal getValorMensal() { return valorMensal; }
    public void setValorMensal(BigDecimal valorMensal) { this.valorMensal = valorMensal; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public Integer getDiaPagamento() { return diaPagamento; }
    public void setDiaPagamento(Integer diaPagamento) { this.diaPagamento = diaPagamento; }
    public LocalDate getDataInicio() { return dataInicio; }
    public void setDataInicio(LocalDate dataInicio) { this.dataInicio = dataInicio; }
    public Integer getParcelas() { return parcelas; }
    public void setParcelas(Integer parcelas) { this.parcelas = parcelas; }
    public Integer getParcelaAtual() { return parcelaAtual; }
    public void setParcelaAtual(Integer parcelaAtual) { this.parcelaAtual = parcelaAtual; }
    public LocalDate getDataInicioCobranca() { return dataInicioCobranca; }
    public void setDataInicioCobranca(LocalDate dataInicioCobranca) { this.dataInicioCobranca = dataInicioCobranca; }
}
