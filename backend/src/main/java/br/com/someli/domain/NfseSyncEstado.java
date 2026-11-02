package br.com.someli.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** Cursor da distribuição de NFS-e do ADN por cliente (último NSU) e situação da última consulta. */
@Entity
@Table(name = "nfse_sync_estado")
public class NfseSyncEstado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false, unique = true)
    private Cliente cliente;

    @Column(nullable = false)
    private boolean ativo;

    @Column(name = "ultimo_nsu", nullable = false)
    private long ultimoNsu;

    @Column(name = "ultima_consulta")
    private LocalDateTime ultimaConsulta;

    @Column(name = "proxima_consulta")
    private LocalDateTime proximaConsulta;

    /** EM_DIA | LIMITE | ERRO | SEM_CERTIFICADO */
    @Column(name = "ultimo_status", length = 30)
    private String ultimoStatus;

    @Column(name = "ultima_mensagem", length = 500)
    private String ultimaMensagem;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public long getUltimoNsu() { return ultimoNsu; }
    public void setUltimoNsu(long ultimoNsu) { this.ultimoNsu = ultimoNsu; }
    public LocalDateTime getUltimaConsulta() { return ultimaConsulta; }
    public void setUltimaConsulta(LocalDateTime ultimaConsulta) { this.ultimaConsulta = ultimaConsulta; }
    public LocalDateTime getProximaConsulta() { return proximaConsulta; }
    public void setProximaConsulta(LocalDateTime proximaConsulta) { this.proximaConsulta = proximaConsulta; }
    public String getUltimoStatus() { return ultimoStatus; }
    public void setUltimoStatus(String ultimoStatus) { this.ultimoStatus = ultimoStatus; }
    public String getUltimaMensagem() { return ultimaMensagem; }
    public void setUltimaMensagem(String ultimaMensagem) {
        this.ultimaMensagem = ultimaMensagem != null && ultimaMensagem.length() > 500
                ? ultimaMensagem.substring(0, 500) : ultimaMensagem;
    }
}
