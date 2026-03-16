package br.com.someli.dto;

import java.math.BigDecimal;

public class DespesaMensalDTO {
    private Long id;
    private String descricao;
    private BigDecimal valorMensal;
    private Integer diaPagamento;
    private boolean paga;
    private Integer parcelaAtual;
    private Integer parcelas;
    /** Número da parcela do mês visualizado (1/2, 2/2) - baseado no mês, não no pagamento */
    private Integer parcelaDoMes;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public BigDecimal getValorMensal() { return valorMensal; }
    public void setValorMensal(BigDecimal valorMensal) { this.valorMensal = valorMensal; }
    public Integer getDiaPagamento() { return diaPagamento; }
    public void setDiaPagamento(Integer diaPagamento) { this.diaPagamento = diaPagamento; }
    public boolean isPaga() { return paga; }
    public void setPaga(boolean paga) { this.paga = paga; }
    public Integer getParcelaAtual() { return parcelaAtual; }
    public void setParcelaAtual(Integer parcelaAtual) { this.parcelaAtual = parcelaAtual; }
    public Integer getParcelas() { return parcelas; }
    public void setParcelas(Integer parcelas) { this.parcelas = parcelas; }
    public Integer getParcelaDoMes() { return parcelaDoMes; }
    public void setParcelaDoMes(Integer parcelaDoMes) { this.parcelaDoMes = parcelaDoMes; }
}
