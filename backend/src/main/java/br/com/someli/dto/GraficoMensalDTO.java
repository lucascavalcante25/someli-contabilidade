package br.com.someli.dto;

import java.math.BigDecimal;

public class GraficoMensalDTO {
    private String mes;
    private BigDecimal receita;
    private BigDecimal despesa;

    public GraficoMensalDTO(String mes, BigDecimal receita, BigDecimal despesa) {
        this.mes = mes;
        this.receita = receita;
        this.despesa = despesa;
    }

    public String getMes() { return mes; }
    public void setMes(String mes) { this.mes = mes; }
    public BigDecimal getReceita() { return receita; }
    public void setReceita(BigDecimal receita) { this.receita = receita; }
    public BigDecimal getDespesa() { return despesa; }
    public void setDespesa(BigDecimal despesa) { this.despesa = despesa; }
}
