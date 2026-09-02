package br.com.someli.dto;

public class MensagemDiariaDTO {
    private Long id;
    private Integer diaAno;
    private String texto;
    private String referencia;
    private String tipo;

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
}
