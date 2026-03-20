package br.com.someli.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class CreateClienteObrigacaoRequestDTO {

    @NotNull(message = "Cliente é obrigatório")
    private Long clienteId;

    @NotNull(message = "Obrigação é obrigatória")
    private Long obrigacaoId;

    @NotNull(message = "Data de vencimento é obrigatória")
    private LocalDate dataVencimento;

    private Boolean ativo = Boolean.TRUE;

    private String observacao;

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
}
