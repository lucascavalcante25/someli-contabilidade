package br.com.someli.dto;

import java.time.LocalDateTime;

public class ClienteDocumentoDTO {
    private Long id;
    private Long clienteId;
    private String nomeArquivo;
    private String tipoArquivo;
    private LocalDateTime dataUpload;
    private String descricao;
    private String competencia;
    private String setor;
    private String categoria;
    private String origem;
    private Boolean compartilhadoComCliente;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getClienteId() {
        return clienteId;
    }

    public void setClienteId(Long clienteId) {
        this.clienteId = clienteId;
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

    public String getCompetencia() { return competencia; }
    public void setCompetencia(String competencia) { this.competencia = competencia; }
    public String getSetor() { return setor; }
    public void setSetor(String setor) { this.setor = setor; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getOrigem() { return origem; }
    public void setOrigem(String origem) { this.origem = origem; }
    public Boolean getCompartilhadoComCliente() { return compartilhadoComCliente; }
    public void setCompartilhadoComCliente(Boolean compartilhadoComCliente) {
        this.compartilhadoComCliente = compartilhadoComCliente;
    }
}
