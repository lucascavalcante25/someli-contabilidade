package br.com.someli.dto;

public class ObrigacaoTemplateItemDTO {
    private Long obrigacaoId;
    private String obrigacaoNome;
    private String periodicidade;
    private Integer diaVencimento;
    private Integer ordem;
    private String setor;

    public Long getObrigacaoId() { return obrigacaoId; }
    public void setObrigacaoId(Long obrigacaoId) { this.obrigacaoId = obrigacaoId; }
    public String getObrigacaoNome() { return obrigacaoNome; }
    public void setObrigacaoNome(String obrigacaoNome) { this.obrigacaoNome = obrigacaoNome; }
    public String getPeriodicidade() { return periodicidade; }
    public void setPeriodicidade(String periodicidade) { this.periodicidade = periodicidade; }
    public Integer getDiaVencimento() { return diaVencimento; }
    public void setDiaVencimento(Integer diaVencimento) { this.diaVencimento = diaVencimento; }
    public Integer getOrdem() { return ordem; }
    public void setOrdem(Integer ordem) { this.ordem = ordem; }
    public String getSetor() { return setor; }
    public void setSetor(String setor) { this.setor = setor; }
}
