package br.com.someli.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "despesa")
public class Despesa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String descricao;

    @Column(name = "valor_mensal", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorMensal = BigDecimal.ZERO;

    @Column(nullable = false, length = 30)
    private String tipo;

    @Column(name = "dia_pagamento", nullable = false)
    private Integer diaPagamento = 10;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column
    private Integer parcelas;

    @Column(name = "parcela_atual")
    private Integer parcelaAtual = 1;

    @Column(nullable = false)
    private Boolean ativo = Boolean.TRUE;

    @Column(name = "data_criacao", nullable = false)
    private LocalDateTime dataCriacao;

    @PrePersist
    public void prePersist() {
        if (dataCriacao == null) dataCriacao = LocalDateTime.now();
        if (parcelaAtual == null) parcelaAtual = 1;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean ativo) { this.ativo = ativo; }
    public LocalDateTime getDataCriacao() { return dataCriacao; }
    public void setDataCriacao(LocalDateTime dataCriacao) { this.dataCriacao = dataCriacao; }
}
