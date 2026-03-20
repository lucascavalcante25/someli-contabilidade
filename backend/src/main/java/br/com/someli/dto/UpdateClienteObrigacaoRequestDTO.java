package br.com.someli.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class UpdateClienteObrigacaoRequestDTO {

    @NotNull(message = "Data de vencimento é obrigatória")
    private LocalDate dataVencimento;

    private Boolean ativo = Boolean.TRUE;

    private String observacao;

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
