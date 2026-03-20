package br.com.someli.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "obrigacao")
public class Obrigacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, length = 30)
    private String tipo;

    @Column(length = 500)
    private String descricao;

    @Column(name = "dias_antecedencia_alerta", nullable = false)
    private Integer diasAntecedenciaAlerta = 7;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public Integer getDiasAntecedenciaAlerta() {
        return diasAntecedenciaAlerta;
    }

    public void setDiasAntecedenciaAlerta(Integer diasAntecedenciaAlerta) {
        this.diasAntecedenciaAlerta = diasAntecedenciaAlerta;
    }
}
