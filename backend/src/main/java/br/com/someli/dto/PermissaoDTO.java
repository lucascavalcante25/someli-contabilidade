package br.com.someli.dto;

public class PermissaoDTO {
    private Long id;
    private String codigo;
    private String modulo;
    private String descricao;
    private Boolean sensivel;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public Boolean getSensivel() { return sensivel; }
    public void setSensivel(Boolean sensivel) { this.sensivel = sensivel; }
}
