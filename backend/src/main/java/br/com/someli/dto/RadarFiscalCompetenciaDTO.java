package br.com.someli.dto;

import java.math.BigDecimal;

/**
 * Resumo leve por competência a partir de XMLs já importados (sem SEFAZ).
 */
public class RadarFiscalCompetenciaDTO {
    private String competencia;
    private long qtdEntrada;
    private long qtdSaida;
    private long qtdSemClassificacao;
    private BigDecimal valorEntrada = BigDecimal.ZERO;
    private BigDecimal valorSaida = BigDecimal.ZERO;
    private long totalXml;
    private String status; // OK | PARCIAL | SEM_XML
    private String observacao;

    public String getCompetencia() { return competencia; }
    public void setCompetencia(String competencia) { this.competencia = competencia; }
    public long getQtdEntrada() { return qtdEntrada; }
    public void setQtdEntrada(long qtdEntrada) { this.qtdEntrada = qtdEntrada; }
    public long getQtdSaida() { return qtdSaida; }
    public void setQtdSaida(long qtdSaida) { this.qtdSaida = qtdSaida; }
    public long getQtdSemClassificacao() { return qtdSemClassificacao; }
    public void setQtdSemClassificacao(long qtdSemClassificacao) { this.qtdSemClassificacao = qtdSemClassificacao; }
    public BigDecimal getValorEntrada() { return valorEntrada; }
    public void setValorEntrada(BigDecimal valorEntrada) { this.valorEntrada = valorEntrada; }
    public BigDecimal getValorSaida() { return valorSaida; }
    public void setValorSaida(BigDecimal valorSaida) { this.valorSaida = valorSaida; }
    public long getTotalXml() { return totalXml; }
    public void setTotalXml(long totalXml) { this.totalXml = totalXml; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
}
