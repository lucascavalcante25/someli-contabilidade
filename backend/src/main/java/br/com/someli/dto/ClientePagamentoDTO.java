package br.com.someli.dto;

import java.math.BigDecimal;
import java.util.List;

public class ClientePagamentoDTO {
    private Long id;
    private String nomeFantasia;
    private BigDecimal honorario;
    private Integer diaVencimento;
    private boolean pago;
    private String status;
    private Integer mesesPendentes;
    private List<String> mesesPendentesDetalhe;
    private BigDecimal valorPendente;

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
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getMesesPendentes() { return mesesPendentes; }
    public void setMesesPendentes(Integer mesesPendentes) { this.mesesPendentes = mesesPendentes; }
    public List<String> getMesesPendentesDetalhe() { return mesesPendentesDetalhe; }
    public void setMesesPendentesDetalhe(List<String> mesesPendentesDetalhe) { this.mesesPendentesDetalhe = mesesPendentesDetalhe; }
    public BigDecimal getValorPendente() { return valorPendente; }
    public void setValorPendente(BigDecimal valorPendente) { this.valorPendente = valorPendente; }
}
