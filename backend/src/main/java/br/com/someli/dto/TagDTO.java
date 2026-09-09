package br.com.someli.dto;

public class TagDTO {
    private Long id;
    private String nome;
    private String cor;

    public TagDTO() {
    }

    public TagDTO(Long id, String nome, String cor) {
        this.id = id;
        this.nome = nome;
        this.cor = cor;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getCor() { return cor; }
    public void setCor(String cor) { this.cor = cor; }
}
