package br.com.someli.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Cenário de simulação CBS/IBS salvo para um cliente: a operação enviada e a resposta da calculadora
 * da Receita, guardadas como vieram (JSON em texto), com a versão que calculou.
 */
@Entity
@Table(name = "simulacao_rtc_cenario")
public class SimulacaoRtcCenario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @Column(nullable = false, length = 120)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RegimeRtc regime;

    @Column(length = 1000)
    private String observacao;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String entrada;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String resultado;

    @Column(name = "versao_calculadora", length = 40)
    private String versaoCalculadora;

    @Column(name = "versao_base", length = 40)
    private String versaoBase;

    @Column(name = "aviso_dados_simulados", length = 200)
    private String avisoDadosSimulados;

    @Column(nullable = false)
    private boolean ativo = true;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criado_por_id")
    private Usuario criadoPor;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm;

    @PrePersist
    public void prePersist() {
        LocalDateTime agora = LocalDateTime.now();
        if (criadoEm == null) criadoEm = agora;
        if (atualizadoEm == null) atualizadoEm = agora;
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public RegimeRtc getRegime() { return regime; }
    public void setRegime(RegimeRtc regime) { this.regime = regime; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
    public String getEntrada() { return entrada; }
    public void setEntrada(String entrada) { this.entrada = entrada; }
    public String getResultado() { return resultado; }
    public void setResultado(String resultado) { this.resultado = resultado; }
    public String getVersaoCalculadora() { return versaoCalculadora; }
    public void setVersaoCalculadora(String versaoCalculadora) { this.versaoCalculadora = versaoCalculadora; }
    public String getVersaoBase() { return versaoBase; }
    public void setVersaoBase(String versaoBase) { this.versaoBase = versaoBase; }
    public String getAvisoDadosSimulados() { return avisoDadosSimulados; }
    public void setAvisoDadosSimulados(String avisoDadosSimulados) { this.avisoDadosSimulados = avisoDadosSimulados; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
    public Usuario getCriadoPor() { return criadoPor; }
    public void setCriadoPor(Usuario criadoPor) { this.criadoPor = criadoPor; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
    public void setAtualizadoEm(LocalDateTime atualizadoEm) { this.atualizadoEm = atualizadoEm; }
}
