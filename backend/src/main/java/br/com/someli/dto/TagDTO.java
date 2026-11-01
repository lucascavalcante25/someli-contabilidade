package br.com.someli.dto;

public class TagDTO {
    private Long id;
    private String nome;
    private String cor;
    private Boolean automatica;
    private String regra;

    public TagDTO() {
    }

    public TagDTO(Long id, String nome, String cor) {
        this(id, nome, cor, false, null);
    }

    public TagDTO(Long id, String nome, String cor, Boolean automatica, String regra) {
        this.id = id;
        this.nome = nome;
        this.cor = cor;
        this.automatica = automatica;
        this.regra = regra;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getCor() { return cor; }
    public void setCor(String cor) { this.cor = cor; }
    public Boolean getAutomatica() { return automatica; }
    public void setAutomatica(Boolean automatica) { this.automatica = automatica; }
    public String getRegra() { return regra; }
    public void setRegra(String regra) { this.regra = regra; }
}
