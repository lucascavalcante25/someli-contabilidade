package br.com.someli.dto;

import java.time.LocalDate;

public class ClienteObrigacaoDTO {
    private Long id;
    private Long clienteId;
    private Long obrigacaoId;
    private String obrigacaoNome;
    private String obrigacaoTipo;
    private LocalDate dataVencimento;
    private Boolean ativo;
    private String observacao;
    private String status; // em_dia, a_vencer, atrasado

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getClienteId() {
        return clienteId;
    }

    public void setClienteId(Long clienteId) {
        this.clienteId = clienteId;
    }

    public Long getObrigacaoId() {
        return obrigacaoId;
    }

    public void setObrigacaoId(Long obrigacaoId) {
        this.obrigacaoId = obrigacaoId;
    }

    public String getObrigacaoNome() {
        return obrigacaoNome;
    }

    public void setObrigacaoNome(String obrigacaoNome) {
        this.obrigacaoNome = obrigacaoNome;
    }

    public String getObrigacaoTipo() {
        return obrigacaoTipo;
    }

    public void setObrigacaoTipo(String obrigacaoTipo) {
        this.obrigacaoTipo = obrigacaoTipo;
    }

    public LocalDate getDataVencimento() {
        return dataVencimento;
    }

    public void setDataVencimento(LocalDate dataVencimento) {
        this.dataVencimento = dataVencimento;
    }

    public Boolean getAtivo() {
        return ativo;
    }

    public void setAtivo(Boolean ativo) {
        this.ativo = ativo;
    }

    public String getObservacao() {
        return observacao;
    }

    public void setObservacao(String observacao) {
        this.observacao = observacao;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
