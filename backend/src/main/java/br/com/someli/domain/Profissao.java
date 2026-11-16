package br.com.someli.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Profissão e o seu dia comemorativo (ex.: Dentista, 25/10). Editável pelo escritório. */
@Entity
@Table(name = "profissao")
public class Profissao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String nome;

    @Column(nullable = false)
    private Integer dia;

    @Column(nullable = false)
    private Integer mes;

    /** Prefixos de CNAE (só números, separados por vírgula) usados para sugerir a profissão. */
    @Column(name = "cnae_prefixos", length = 200)
    private String cnaePrefixos;

    @Column(nullable = false)
    private Boolean ativo = Boolean.TRUE;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public Integer getDia() { return dia; }
    public void setDia(Integer dia) { this.dia = dia; }
    public Integer getMes() { return mes; }
    public void setMes(Integer mes) { this.mes = mes; }
    public String getCnaePrefixos() { return cnaePrefixos; }
    public void setCnaePrefixos(String cnaePrefixos) { this.cnaePrefixos = cnaePrefixos; }
    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean ativo) { this.ativo = ativo; }
}
