package br.com.someli.domain;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "pagamento_mensal", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"cliente_id", "mes", "ano"})
})
public class PagamentoMensal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cliente_id", nullable = false)
    private Long clienteId;

    @Column(nullable = false)
    private Integer mes;

    @Column(nullable = false)
    private Integer ano;

    @Column(nullable = false)
    private Boolean pago = Boolean.FALSE;

    /** Se false, o mês não entra na cobrança (ex.: traço na planilha). */
    @Column(nullable = false)
    private Boolean cobravel = Boolean.TRUE;

    /** Boleto do mês já enviado ao cliente (controle para não duplicar nem esquecer). */
    @Column(name = "boleto_enviado", nullable = false)
    private Boolean boletoEnviado = Boolean.FALSE;

    @Column(name = "boleto_enviado_em")
    private java.time.LocalDateTime boletoEnviadoEm;

    @Column(name = "boleto_enviado_por", length = 120)
    private String boletoEnviadoPor;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public Integer getMes() { return mes; }
    public void setMes(Integer mes) { this.mes = mes; }
    public Integer getAno() { return ano; }
    public void setAno(Integer ano) { this.ano = ano; }
    public Boolean getPago() { return pago; }
    public void setPago(Boolean pago) { this.pago = pago; }
    public Boolean getCobravel() { return cobravel; }
    public void setCobravel(Boolean cobravel) { this.cobravel = cobravel; }
    public Boolean getBoletoEnviado() { return boletoEnviado; }
    public void setBoletoEnviado(Boolean boletoEnviado) { this.boletoEnviado = boletoEnviado; }
    public java.time.LocalDateTime getBoletoEnviadoEm() { return boletoEnviadoEm; }
    public void setBoletoEnviadoEm(java.time.LocalDateTime boletoEnviadoEm) { this.boletoEnviadoEm = boletoEnviadoEm; }
    public String getBoletoEnviadoPor() { return boletoEnviadoPor; }
    public void setBoletoEnviadoPor(String boletoEnviadoPor) { this.boletoEnviadoPor = boletoEnviadoPor; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PagamentoMensal that = (PagamentoMensal) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
