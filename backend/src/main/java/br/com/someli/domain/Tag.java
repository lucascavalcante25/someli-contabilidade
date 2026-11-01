package br.com.someli.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tag")
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 60)
    private String nome;

    @Column(length = 20)
    private String cor;

    /** Se true, a tag é gerida pelo sistema (não deve ficar "grudada" manualmente). */
    @Column(nullable = false)
    private Boolean automatica = Boolean.FALSE;

    /** Código da regra: NOVO_CLIENTE | INADIMPLENTE (nulo = manual). */
    @Column(length = 40)
    private String regra;

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
