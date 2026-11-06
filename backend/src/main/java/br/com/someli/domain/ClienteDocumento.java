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
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "cliente_documento")
public class ClienteDocumento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @Column(name = "nome_arquivo", length = 255)
    private String nomeArquivo;

    @Column(name = "tipo_arquivo", length = 120)
    private String tipoArquivo;

    @Column(name = "url_arquivo", columnDefinition = "TEXT")
    private String urlArquivo;

    @Column(name = "data_upload")
    private LocalDateTime dataUpload;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(name = "compartilhado_com_cliente", nullable = false)
    private Boolean compartilhadoComCliente = Boolean.FALSE;

    /** Competência YYYY-MM para conferência mensal */
    @Column(length = 7)
    private String competencia;

    @Column(length = 40)
    private String setor;

    @Column(nullable = false, length = 40)
    private String origem = "INTERNO";

    /** GERAL | EXTRATO | NF | FOLHA | GUIA | CERTIDAO | OUTROS */
    @Column(nullable = false, length = 40)
    private String categoria = "GERAL";

    @PrePersist
    public void prePersist() {
        if (dataUpload == null) {
            dataUpload = LocalDateTime.now();
        }
        if (compartilhadoComCliente == null) compartilhadoComCliente = Boolean.FALSE;
        if (origem == null) origem = "INTERNO";
        if (categoria == null) categoria = "GERAL";
    }

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

    public String getNomeArquivo() {
        return nomeArquivo;
    }

    public void setNomeArquivo(String nomeArquivo) {
        this.nomeArquivo = nomeArquivo;
    }

    public String getTipoArquivo() {
        return tipoArquivo;
    }

    public void setTipoArquivo(String tipoArquivo) {
        this.tipoArquivo = tipoArquivo;
    }

    public String getUrlArquivo() {
        return urlArquivo;
    }

    public void setUrlArquivo(String urlArquivo) {
        this.urlArquivo = urlArquivo;
    }

    public LocalDateTime getDataUpload() {
        return dataUpload;
    }

    public void setDataUpload(LocalDateTime dataUpload) {
        this.dataUpload = dataUpload;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public Boolean getCompartilhadoComCliente() {
        return compartilhadoComCliente;
    }

    public void setCompartilhadoComCliente(Boolean compartilhadoComCliente) {
        this.compartilhadoComCliente = compartilhadoComCliente;
    }

    public String getCompetencia() {
        return competencia;
    }

    public void setCompetencia(String competencia) {
        this.competencia = competencia;
    }

    public String getSetor() {
        return setor;
    }

    public void setSetor(String setor) {
        this.setor = setor;
    }

    public String getOrigem() {
        return origem;
    }

    public void setOrigem(String origem) {
        this.origem = origem;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }
}
