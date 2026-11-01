package br.com.someli.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "obrigacao_template_item")
public class ObrigacaoTemplateItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private ObrigacaoTemplate template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "obrigacao_id", nullable = false)
    private Obrigacao obrigacao;

    @Column(length = 20)
    private String periodicidade;

    @Column(name = "dia_vencimento")
    private Integer diaVencimento;

    @Column(nullable = false)
    private Integer ordem = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public ObrigacaoTemplate getTemplate() { return template; }
    public void setTemplate(ObrigacaoTemplate template) { this.template = template; }
    public Obrigacao getObrigacao() { return obrigacao; }
    public void setObrigacao(Obrigacao obrigacao) { this.obrigacao = obrigacao; }
    public String getPeriodicidade() { return periodicidade; }
    public void setPeriodicidade(String periodicidade) { this.periodicidade = periodicidade; }
    public Integer getDiaVencimento() { return diaVencimento; }
    public void setDiaVencimento(Integer diaVencimento) { this.diaVencimento = diaVencimento; }
    public Integer getOrdem() { return ordem; }
    public void setOrdem(Integer ordem) { this.ordem = ordem; }
}
