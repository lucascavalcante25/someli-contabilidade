package br.com.someli.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "mensagem_diaria")
public class MensagemDiaria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dia_ano", nullable = false, unique = true, columnDefinition = "SMALLINT")
    private Integer diaAno;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String texto;

    @Column(length = 160)
    private String referencia;

    @Column(nullable = false, length = 30)
    private String tipo = "versiculo";

    @Column(nullable = false)
    private Boolean ativo = Boolean.TRUE;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getDiaAno() { return diaAno; }
    public void setDiaAno(Integer diaAno) { this.diaAno = diaAno; }
    public String getTexto() { return texto; }
    public void setTexto(String texto) { this.texto = texto; }
    public String getReferencia() { return referencia; }
    public void setReferencia(String referencia) { this.referencia = referencia; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean ativo) { this.ativo = ativo; }
}
