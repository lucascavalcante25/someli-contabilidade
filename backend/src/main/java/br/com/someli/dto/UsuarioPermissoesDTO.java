package br.com.someli.dto;

import java.util.List;

public class UsuarioPermissoesDTO {
    private Long usuarioId;
    private String perfil;
    private Boolean alcadaGlobal;
    private List<String> herdadas;
    private List<String> concedidas;
    private List<String> revogadas;
    private List<String> efetivas;

    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getPerfil() { return perfil; }
    public void setPerfil(String perfil) { this.perfil = perfil; }
    public Boolean getAlcadaGlobal() { return alcadaGlobal; }
    public void setAlcadaGlobal(Boolean alcadaGlobal) { this.alcadaGlobal = alcadaGlobal; }
    public List<String> getHerdadas() { return herdadas; }
    public void setHerdadas(List<String> herdadas) { this.herdadas = herdadas; }
    public List<String> getConcedidas() { return concedidas; }
    public void setConcedidas(List<String> concedidas) { this.concedidas = concedidas; }
    public List<String> getRevogadas() { return revogadas; }
    public void setRevogadas(List<String> revogadas) { this.revogadas = revogadas; }
    public List<String> getEfetivas() { return efetivas; }
    public void setEfetivas(List<String> efetivas) { this.efetivas = efetivas; }
}
