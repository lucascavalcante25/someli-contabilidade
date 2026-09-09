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

import java.time.LocalDate;

@Entity
@Table(name = "cliente_obrigacao")
public class ClienteObrigacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "obrigacao_id", nullable = false)
    private Obrigacao obrigacao;

    @Column(name = "data_vencimento", nullable = false)
    private LocalDate dataVencimento;

    @Column(nullable = false)
    private Boolean ativo = Boolean.TRUE;

    @Column(length = 500)
    private String observacao;

    @Column(nullable = false, length = 20)
    private String periodicidade = PeriodicidadeObrigacao.UNICA;

    @Column(name = "dia_vencimento")
    private Integer diaVencimento;

    @Column(name = "tipo_regra_vencimento", nullable = false, length = 40)
    private String tipoRegraVencimento = "DIA_FIXO";

    @Column(length = 40)
    private String setor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_usuario_id")
    private Usuario responsavel;

    @Column(name = "dias_antecedencia_alerta")
    private Integer diasAntecedenciaAlerta;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Cliente getCliente() {
        return cliente;
    }

    public void setCliente(Cliente cliente) {
        this.cliente = cliente;
    }

    public Obrigacao getObrigacao() {
        return obrigacao;
    }

    public void setObrigacao(Obrigacao obrigacao) {
        this.obrigacao = obrigacao;
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
    public Usuario getResponsavel() { return responsavel; }
    public void setResponsavel(Usuario responsavel) { this.responsavel = responsavel; }
    public Integer getDiasAntecedenciaAlerta() { return diasAntecedenciaAlerta; }
    public void setDiasAntecedenciaAlerta(Integer diasAntecedenciaAlerta) { this.diasAntecedenciaAlerta = diasAntecedenciaAlerta; }

    public Integer resolverDiasAntecedencia() {
        if (diasAntecedenciaAlerta != null) return diasAntecedenciaAlerta;
        if (obrigacao != null && obrigacao.getDiasAntecedenciaAlerta() != null) {
            return obrigacao.getDiasAntecedenciaAlerta();
        }
        return 7;
    }

    public String resolverSetor() {
        if (setor != null && !setor.isBlank()) return setor;
        if (obrigacao != null && obrigacao.getSetor() != null) return obrigacao.getSetor();
        return SetorResponsabilidade.FISCAL;
    }
}
