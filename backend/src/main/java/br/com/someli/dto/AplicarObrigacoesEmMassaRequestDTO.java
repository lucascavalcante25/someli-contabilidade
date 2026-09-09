package br.com.someli.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public class AplicarObrigacoesEmMassaRequestDTO {

    @NotEmpty
    private List<Long> clienteIds;

    @NotNull
    private Long obrigacaoId;

    @NotNull
    private LocalDate dataVencimento;

    private String periodicidade;
    private Integer diaVencimento;
    private String setor;
    private String observacao;
    /** Se informado, restringe a clientes que possuem esta tag (interseção com clienteIds). */
    private Long tagId;

    public List<Long> getClienteIds() { return clienteIds; }
    public void setClienteIds(List<Long> clienteIds) { this.clienteIds = clienteIds; }
    public Long getObrigacaoId() { return obrigacaoId; }
    public void setObrigacaoId(Long obrigacaoId) { this.obrigacaoId = obrigacaoId; }
    public LocalDate getDataVencimento() { return dataVencimento; }
    public void setDataVencimento(LocalDate dataVencimento) { this.dataVencimento = dataVencimento; }
    public String getPeriodicidade() { return periodicidade; }
    public void setPeriodicidade(String periodicidade) { this.periodicidade = periodicidade; }
    public Integer getDiaVencimento() { return diaVencimento; }
    public void setDiaVencimento(Integer diaVencimento) { this.diaVencimento = diaVencimento; }
    public String getSetor() { return setor; }
    public void setSetor(String setor) { this.setor = setor; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
    public Long getTagId() { return tagId; }
    public void setTagId(Long tagId) { this.tagId = tagId; }
}
