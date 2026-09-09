package br.com.someli.dto;

import java.time.LocalDateTime;

public class NotificationDTO {
    private Long id;
    private Long clienteObrigacaoId;
    private Long clienteId;
    private Long ocorrenciaId;
    private String titulo;
    private String descricao;
    private String prioridade;
    private String tipo;
    private String link;
    private LocalDateTime dataCriacao;
    private Boolean lida;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getClienteObrigacaoId() { return clienteObrigacaoId; }
    public void setClienteObrigacaoId(Long clienteObrigacaoId) { this.clienteObrigacaoId = clienteObrigacaoId; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public Long getOcorrenciaId() { return ocorrenciaId; }
    public void setOcorrenciaId(Long ocorrenciaId) { this.ocorrenciaId = ocorrenciaId; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public String getPrioridade() { return prioridade; }
    public void setPrioridade(String prioridade) { this.prioridade = prioridade; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }
    public LocalDateTime getDataCriacao() { return dataCriacao; }
    public void setDataCriacao(LocalDateTime dataCriacao) { this.dataCriacao = dataCriacao; }
    public Boolean getLida() { return lida; }
    public void setLida(Boolean lida) { this.lida = lida; }
}
