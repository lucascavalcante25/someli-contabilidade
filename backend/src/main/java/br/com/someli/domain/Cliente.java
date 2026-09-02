package br.com.someli.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cliente")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 14)
    private String cnpj;

    @Column(name = "razao_social", nullable = false)
    private String razaoSocial;

    @Column(name = "nome_fantasia")
    private String nomeFantasia;

    @Column
    private String proprietario;

    @Column
    private String telefone;

    @Column
    private String email;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal honorario = BigDecimal.ZERO;

    @Column(name = "dia_vencimento", nullable = false)
    private Integer diaVencimento = 10;

    @Column(name = "tipo_pagamento", nullable = false, length = 30)
    private String tipoPagamento;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "data_criacao", nullable = false)
    private LocalDateTime dataCriacao;

    @Column(name = "data_inicio_cobranca")
    private LocalDate dataInicioCobranca;

    @Column(name = "data_fim_cobranca")
    private LocalDate dataFimCobranca;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_id")
    private Usuario responsavel;

    @Column
    private String indicacao;

    @Column(name = "forma_pagamento", length = 30)
    private String formaPagamento;

    @Column(nullable = false)
    private Boolean ativo = Boolean.TRUE;

    /** Quantidade de meses sem pagamento desde o início da cobrança até o mês atual (não persistido). */
    @Transient
    private Integer mesesPendentes;

    /** Rótulos dos meses pendentes, ex.: "Jan/2026" (não persistido). */
    @Transient
    private java.util.List<String> mesesPendentesDetalhe;

    /** Valor total em aberto = honorário × meses pendentes (não persistido). */
    @Transient
    private java.math.BigDecimal valorPendente;

    @PrePersist
    public void prePersist() {
        if (dataCriacao == null) {
            dataCriacao = LocalDateTime.now();
        }
        if (honorario == null) {
            honorario = BigDecimal.ZERO;
        }
        if (diaVencimento == null) {
            diaVencimento = 10;
        }
        if (ativo == null) {
            ativo = Boolean.TRUE;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCnpj() {
        return cnpj;
    }

    public void setCnpj(String cnpj) {
        this.cnpj = cnpj;
    }

    public String getRazaoSocial() {
        return razaoSocial;
    }

    public void setRazaoSocial(String razaoSocial) {
        this.razaoSocial = razaoSocial;
    }

    public String getNomeFantasia() {
        return nomeFantasia;
    }

    public void setNomeFantasia(String nomeFantasia) {
        this.nomeFantasia = nomeFantasia;
    }

    public String getProprietario() {
        return proprietario;
    }

    public void setProprietario(String proprietario) {
        this.proprietario = proprietario;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public BigDecimal getHonorario() {
        return honorario;
    }

    public void setHonorario(BigDecimal honorario) {
        this.honorario = honorario;
    }

    public Integer getDiaVencimento() {
        return diaVencimento;
    }

    public void setDiaVencimento(Integer diaVencimento) {
        this.diaVencimento = diaVencimento;
    }

    public String getTipoPagamento() {
        return tipoPagamento;
    }

    public void setTipoPagamento(String tipoPagamento) {
        this.tipoPagamento = tipoPagamento;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getDataCriacao() {
        return dataCriacao;
    }

    public void setDataCriacao(LocalDateTime dataCriacao) {
        this.dataCriacao = dataCriacao;
    }

    public LocalDate getDataInicioCobranca() {
        return dataInicioCobranca;
    }

    public void setDataInicioCobranca(LocalDate dataInicioCobranca) {
        this.dataInicioCobranca = dataInicioCobranca;
    }

    public LocalDate getDataFimCobranca() {
        return dataFimCobranca;
    }

    public void setDataFimCobranca(LocalDate dataFimCobranca) {
        this.dataFimCobranca = dataFimCobranca;
    }

    public Usuario getResponsavel() {
        return responsavel;
    }

    public void setResponsavel(Usuario responsavel) {
        this.responsavel = responsavel;
    }

    public String getIndicacao() {
        return indicacao;
    }

    public void setIndicacao(String indicacao) {
        this.indicacao = indicacao;
    }

    public String getFormaPagamento() {
        return formaPagamento;
    }

    public void setFormaPagamento(String formaPagamento) {
        this.formaPagamento = formaPagamento;
    }

    public Boolean getAtivo() {
        return ativo;
    }

    public void setAtivo(Boolean ativo) {
        this.ativo = ativo;
    }

    public Integer getMesesPendentes() {
        return mesesPendentes;
    }

    public void setMesesPendentes(Integer mesesPendentes) {
        this.mesesPendentes = mesesPendentes;
    }

    public java.util.List<String> getMesesPendentesDetalhe() {
        return mesesPendentesDetalhe;
    }

    public void setMesesPendentesDetalhe(java.util.List<String> mesesPendentesDetalhe) {
        this.mesesPendentesDetalhe = mesesPendentesDetalhe;
    }

    public java.math.BigDecimal getValorPendente() {
        return valorPendente;
    }

    public void setValorPendente(java.math.BigDecimal valorPendente) {
        this.valorPendente = valorPendente;
    }
}
