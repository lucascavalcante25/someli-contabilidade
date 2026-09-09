package br.com.someli.dto;

import java.time.LocalDate;

public class UpsertClienteResponsavelRequestDTO {
    private String setor;
    private Long usuarioId;
    private LocalDate dataInicio;

    public String getSetor() { return setor; }
    public void setSetor(String setor) { this.setor = setor; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public LocalDate getDataInicio() { return dataInicio; }
    public void setDataInicio(LocalDate dataInicio) { this.dataInicio = dataInicio; }
}
