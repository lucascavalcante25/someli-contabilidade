package br.com.someli.dto;

import java.util.List;

public class UpdateUsuarioPermissoesRequestDTO {
    private List<String> permissoes;
    private Boolean alcadaGlobal;

    public List<String> getPermissoes() { return permissoes; }
    public void setPermissoes(List<String> permissoes) { this.permissoes = permissoes; }
    public Boolean getAlcadaGlobal() { return alcadaGlobal; }
    public void setAlcadaGlobal(Boolean alcadaGlobal) { this.alcadaGlobal = alcadaGlobal; }
}
