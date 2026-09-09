package br.com.someli.dto;

import java.time.LocalDate;

public class ClienteResponsavelDTO {
    private Long id;
    private Long clienteId;
    private Long usuarioId;
    private String usuarioNome;
    private String setor;
    private String setorLabel;
    private Boolean ativo;
    private LocalDate dataInicio;
    private LocalDate dataFim;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getUsuarioNome() { return usuarioNome; }
    public void setUsuarioNome(String usuarioNome) { this.usuarioNome = usuarioNome; }
    public String getSetor() { return setor; }
    public void setSetor(String setor) { this.setor = setor; }
    public String getSetorLabel() { return setorLabel; }
    public void setSetorLabel(String setorLabel) { this.setorLabel = setorLabel; }
    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean ativo) { this.ativo = ativo; }
    public LocalDate getDataInicio() { return dataInicio; }
    public void setDataInicio(LocalDate dataInicio) { this.dataInicio = dataInicio; }
    public LocalDate getDataFim() { return dataFim; }
    public void setDataFim(LocalDate dataFim) { this.dataFim = dataFim; }
}
