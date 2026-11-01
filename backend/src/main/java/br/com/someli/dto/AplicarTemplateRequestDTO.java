package br.com.someli.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public class AplicarTemplateRequestDTO {

    /** Clientes alvo. Se vazio e {@code apenasDoRegime}=true, usa todos ativos do regime do template. */
    private List<Long> clienteIds;

    @NotNull
    private LocalDate dataVencimento;

    /** Se true, une/substitui a lista pelos clientes ativos com o mesmo regime do template. */
    private Boolean apenasDoRegime = Boolean.FALSE;

    private Long tagId;
    private String observacao;

    public List<Long> getClienteIds() { return clienteIds; }
    public void setClienteIds(List<Long> clienteIds) { this.clienteIds = clienteIds; }
    public LocalDate getDataVencimento() { return dataVencimento; }
    public void setDataVencimento(LocalDate dataVencimento) { this.dataVencimento = dataVencimento; }
    public Boolean getApenasDoRegime() { return apenasDoRegime; }
    public void setApenasDoRegime(Boolean apenasDoRegime) { this.apenasDoRegime = apenasDoRegime; }
    public Long getTagId() { return tagId; }
    public void setTagId(Long tagId) { this.tagId = tagId; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
}
