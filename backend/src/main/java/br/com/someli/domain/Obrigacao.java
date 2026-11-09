package br.com.someli.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "obrigacao")
public class Obrigacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, length = 30)
    private String tipo;

    @Column(length = 500)
    private String descricao;

    @Column(name = "dias_antecedencia_alerta", nullable = false)
    private Integer diasAntecedenciaAlerta = 7;

    @Column(nullable = false, length = 40)
    private String setor = "FISCAL";

    @Column(name = "periodicidade_padrao", nullable = false, length = 20)
    private String periodicidadePadrao = PeriodicidadeObrigacao.UNICA;

    @Column(name = "dia_vencimento_padrao")
    private Integer diaVencimentoPadrao;

    @Column(name = "tipo_regra_vencimento", nullable = false, length = 40)
    private String tipoRegraVencimento = "DIA_FIXO";

    @Column(nullable = false)
    private Boolean ativo = Boolean.TRUE;

    /** Portal oficial onde a obrigação costuma ser cumprida (ex.: eSocial, PGDAS). */
    @Column(name = "url_portal", length = 500)
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

    public String getSetor() { return setor; }
    public void setSetor(String setor) { this.setor = setor; }
    public String getPeriodicidadePadrao() { return periodicidadePadrao; }
    public void setPeriodicidadePadrao(String periodicidadePadrao) { this.periodicidadePadrao = periodicidadePadrao; }
    public Integer getDiaVencimentoPadrao() { return diaVencimentoPadrao; }
    public void setDiaVencimentoPadrao(Integer diaVencimentoPadrao) { this.diaVencimentoPadrao = diaVencimentoPadrao; }
    public String getTipoRegraVencimento() { return tipoRegraVencimento; }
    public void setTipoRegraVencimento(String tipoRegraVencimento) { this.tipoRegraVencimento = tipoRegraVencimento; }
    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean ativo) { this.ativo = ativo; }
    public String getUrlPortal() { return urlPortal; }
    public void setUrlPortal(String urlPortal) { this.urlPortal = urlPortal; }
}
