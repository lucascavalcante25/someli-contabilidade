package br.com.someli.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ObrigacaoOcorrenciaDTO {
    private Long id;
    private Long clienteObrigacaoId;
    private Long clienteId;
    private String clienteNome;
    /** Nome pelo qual a equipe conhece o cliente (cai na razão social se vazio). */
    private String clienteNomeFantasia;
    private Long obrigacaoId;
    private String obrigacaoNome;
    private String urlPortal;
    private String setor;
    private String competencia;
    private LocalDate dataVencimento;
    private String status;
    private String observacao;
    private String periodicidade;
    private LocalDateTime concluidaEm;
    private String concluidaPorNome;
    private Boolean docsOk;
    private Boolean apurado;
    private Boolean transmitido;
    private Boolean guiaEnviada;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getClienteObrigacaoId() { return clienteObrigacaoId; }
    public void setClienteObrigacaoId(Long clienteObrigacaoId) { this.clienteObrigacaoId = clienteObrigacaoId; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public String getClienteNome() { return clienteNome; }
    public String getClienteNomeFantasia() { return clienteNomeFantasia; }
    public void setClienteNomeFantasia(String clienteNomeFantasia) { this.clienteNomeFantasia = clienteNomeFantasia; }
    public void setClienteNome(String clienteNome) { this.clienteNome = clienteNome; }
    public Long getObrigacaoId() { return obrigacaoId; }
    public void setObrigacaoId(Long obrigacaoId) { this.obrigacaoId = obrigacaoId; }
    public String getObrigacaoNome() { return obrigacaoNome; }
    public void setObrigacaoNome(String obrigacaoNome) { this.obrigacaoNome = obrigacaoNome; }
    public String getUrlPortal() { return urlPortal; }
    public void setUrlPortal(String urlPortal) { this.urlPortal = urlPortal; }
    public String getSetor() { return setor; }
    public void setSetor(String setor) { this.setor = setor; }
    public String getCompetencia() { return competencia; }
    public void setCompetencia(String competencia) { this.competencia = competencia; }
    public LocalDate getDataVencimento() { return dataVencimento; }
    public void setDataVencimento(LocalDate dataVencimento) { this.dataVencimento = dataVencimento; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
    public String getPeriodicidade() { return periodicidade; }
    public void setPeriodicidade(String periodicidade) { this.periodicidade = periodicidade; }
    public LocalDateTime getConcluidaEm() { return concluidaEm; }
    public void setConcluidaEm(LocalDateTime concluidaEm) { this.concluidaEm = concluidaEm; }
    public String getConcluidaPorNome() { return concluidaPorNome; }
    public void setConcluidaPorNome(String concluidaPorNome) { this.concluidaPorNome = concluidaPorNome; }
    public Boolean getDocsOk() { return docsOk; }
    public void setDocsOk(Boolean docsOk) { this.docsOk = docsOk; }
    public Boolean getApurado() { return apurado; }
    public void setApurado(Boolean apurado) { this.apurado = apurado; }
    public Boolean getTransmitido() { return transmitido; }
    public void setTransmitido(Boolean transmitido) { this.transmitido = transmitido; }
    public Boolean getGuiaEnviada() { return guiaEnviada; }
    public void setGuiaEnviada(Boolean guiaEnviada) { this.guiaEnviada = guiaEnviada; }
}
