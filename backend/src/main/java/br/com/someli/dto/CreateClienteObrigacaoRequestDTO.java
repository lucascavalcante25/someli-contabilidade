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

    private String periodicidade;

    private Integer diaVencimento;

    private String tipoRegraVencimento;

    private String setor;

    private Long responsavelUsuarioId;

    private Integer diasAntecedenciaAlerta;

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

    public String getPeriodicidade() { return periodicidade; }
    public void setPeriodicidade(String periodicidade) { this.periodicidade = periodicidade; }
    public Integer getDiaVencimento() { return diaVencimento; }
    public void setDiaVencimento(Integer diaVencimento) { this.diaVencimento = diaVencimento; }
    public String getTipoRegraVencimento() { return tipoRegraVencimento; }
    public void setTipoRegraVencimento(String tipoRegraVencimento) { this.tipoRegraVencimento = tipoRegraVencimento; }
    public String getSetor() { return setor; }
    public void setSetor(String setor) { this.setor = setor; }
    public Long getResponsavelUsuarioId() { return responsavelUsuarioId; }
    public void setResponsavelUsuarioId(Long responsavelUsuarioId) { this.responsavelUsuarioId = responsavelUsuarioId; }
    public Integer getDiasAntecedenciaAlerta() { return diasAntecedenciaAlerta; }
    public void setDiasAntecedenciaAlerta(Integer diasAntecedenciaAlerta) { this.diasAntecedenciaAlerta = diasAntecedenciaAlerta; }
}
