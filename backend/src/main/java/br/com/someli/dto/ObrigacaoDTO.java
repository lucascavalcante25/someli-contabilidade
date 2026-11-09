package br.com.someli.dto;

public class ObrigacaoDTO {
    private Long id;
    private String nome;
    private String tipo;
    private String descricao;
    private Integer diasAntecedenciaAlerta;
    private String urlPortal;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public Integer getDiasAntecedenciaAlerta() {
        return diasAntecedenciaAlerta;
    }

    public void setDiasAntecedenciaAlerta(Integer diasAntecedenciaAlerta) {
        this.diasAntecedenciaAlerta = diasAntecedenciaAlerta;
    }

    public String getUrlPortal() {
        return urlPortal;
    }

    public void setUrlPortal(String urlPortal) {
        this.urlPortal = urlPortal;
    }

    /** Para periodicidade ANUAL: mes (1-12) e dia padrao do vencimento. */
    private String periodicidadePadrao;
    private Integer diaVencimentoPadrao;
    private Integer mesVencimentoPadrao;

    public String getPeriodicidadePadrao() { return periodicidadePadrao; }
    public void setPeriodicidadePadrao(String periodicidadePadrao) { this.periodicidadePadrao = periodicidadePadrao; }
    public Integer getDiaVencimentoPadrao() { return diaVencimentoPadrao; }
    public void setDiaVencimentoPadrao(Integer diaVencimentoPadrao) { this.diaVencimentoPadrao = diaVencimentoPadrao; }
    public Integer getMesVencimentoPadrao() { return mesVencimentoPadrao; }
    public void setMesVencimentoPadrao(Integer mesVencimentoPadrao) { this.mesVencimentoPadrao = mesVencimentoPadrao; }
}
