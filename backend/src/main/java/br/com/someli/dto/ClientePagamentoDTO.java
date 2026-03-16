package br.com.someli.dto;

import java.math.BigDecimal;

public class ClientePagamentoDTO {
    private Long id;
    private String nomeFantasia;
    private BigDecimal honorario;
    private Integer diaVencimento;
    private boolean pago;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNomeFantasia() { return nomeFantasia; }
    public void setNomeFantasia(String nomeFantasia) { this.nomeFantasia = nomeFantasia; }
    public BigDecimal getHonorario() { return honorario; }
    public void setHonorario(BigDecimal honorario) { this.honorario = honorario; }
    public Integer getDiaVencimento() { return diaVencimento; }
    public void setDiaVencimento(Integer diaVencimento) { this.diaVencimento = diaVencimento; }
    public boolean isPago() { return pago; }
    public void setPago(boolean pago) { this.pago = pago; }
}
