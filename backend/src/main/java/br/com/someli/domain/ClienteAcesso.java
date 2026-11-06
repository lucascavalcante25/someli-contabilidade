package br.com.someli.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** Login, senha e observação cifrados. A listagem nunca devolve esses bytes. */
@Entity
@Table(name = "cliente_acesso")
public class ClienteAcesso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @Column(nullable = false, length = 120)
    private String sistema;

    @Column(length = 500)
    private String url;

    @Column(nullable = false)
    private byte[] login;

    @Column(nullable = false)
    private byte[] senha;

    @Column
    private byte[] observacao;

    @Column(length = 40)
    private String setor;

    @Column(nullable = false, length = 20)
    private String origem = "MANUAL";

    @Column(nullable = false)
    private boolean ativo = true;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criado_por_id")
    private Usuario criadoPor;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atualizado_por_id")
    private Usuario atualizadoPor;

    @PrePersist
    public void prePersist() {
        LocalDateTime agora = LocalDateTime.now();
        if (criadoEm == null) criadoEm = agora;
        if (atualizadoEm == null) atualizadoEm = agora;
        if (origem == null || origem.isBlank()) origem = "MANUAL";
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }
    public String getSistema() { return sistema; }
    public void setSistema(String sistema) { this.sistema = sistema; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public byte[] getLogin() { return login; }
    public void setLogin(byte[] login) { this.login = login; }
    public byte[] getSenha() { return senha; }
    public void setSenha(byte[] senha) { this.senha = senha; }
    public byte[] getObservacao() { return observacao; }
    public void setObservacao(byte[] observacao) { this.observacao = observacao; }
    public String getSetor() { return setor; }
    public void setSetor(String setor) { this.setor = setor; }
    public String getOrigem() { return origem; }
    public void setOrigem(String origem) { this.origem = origem; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
    public Usuario getCriadoPor() { return criadoPor; }
    public void setCriadoPor(Usuario criadoPor) { this.criadoPor = criadoPor; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
    public void setAtualizadoEm(LocalDateTime atualizadoEm) { this.atualizadoEm = atualizadoEm; }
    public Usuario getAtualizadoPor() { return atualizadoPor; }
    public void setAtualizadoPor(Usuario atualizadoPor) { this.atualizadoPor = atualizadoPor; }
}
