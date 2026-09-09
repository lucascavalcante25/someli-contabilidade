package br.com.someli.dto;

import java.util.List;

public class LoginResponseDTO {
    private String token;
    private UsuarioDTO usuario;
    private List<String> permissoes;
    private Boolean alcadaGlobal;

    public LoginResponseDTO() {
    }

    public LoginResponseDTO(String token, UsuarioDTO usuario) {
        this.token = token;
        this.usuario = usuario;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public UsuarioDTO getUsuario() { return usuario; }
    public void setUsuario(UsuarioDTO usuario) { this.usuario = usuario; }
    public List<String> getPermissoes() { return permissoes; }
    public void setPermissoes(List<String> permissoes) { this.permissoes = permissoes; }
    public Boolean getAlcadaGlobal() { return alcadaGlobal; }
    public void setAlcadaGlobal(Boolean alcadaGlobal) { this.alcadaGlobal = alcadaGlobal; }
}
