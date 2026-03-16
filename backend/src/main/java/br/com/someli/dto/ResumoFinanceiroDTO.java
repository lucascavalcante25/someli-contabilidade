package br.com.someli.dto;

import java.math.BigDecimal;
import java.util.List;

public class ResumoFinanceiroDTO {
    private BigDecimal receitaTotal;
    private BigDecimal receitaRecebida;
    private BigDecimal receitaPendente;
    private BigDecimal despesaTotal;
    private BigDecimal despesasPagas;
    private BigDecimal despesasPendentes;
    private BigDecimal saldo;
    private int mes;
    private int ano;
    private List<ClientePagamentoDTO> clientes;
    private List<DespesaMensalDTO> despesas;

    public BigDecimal getReceitaTotal() { return receitaTotal; }
    public void setReceitaTotal(BigDecimal receitaTotal) { this.receitaTotal = receitaTotal; }
    public BigDecimal getReceitaRecebida() { return receitaRecebida; }
    public void setReceitaRecebida(BigDecimal receitaRecebida) { this.receitaRecebida = receitaRecebida; }
    public BigDecimal getReceitaPendente() { return receitaPendente; }
    public void setReceitaPendente(BigDecimal receitaPendente) { this.receitaPendente = receitaPendente; }
    public BigDecimal getDespesaTotal() { return despesaTotal; }
    public void setDespesaTotal(BigDecimal despesaTotal) { this.despesaTotal = despesaTotal; }
    public BigDecimal getDespesasPagas() { return despesasPagas; }
    public void setDespesasPagas(BigDecimal despesasPagas) { this.despesasPagas = despesasPagas; }
    public BigDecimal getDespesasPendentes() { return despesasPendentes; }
    public void setDespesasPendentes(BigDecimal despesasPendentes) { this.despesasPendentes = despesasPendentes; }
    public BigDecimal getSaldo() { return saldo; }
    public void setSaldo(BigDecimal saldo) { this.saldo = saldo; }
    public int getMes() { return mes; }
    public void setMes(int mes) { this.mes = mes; }
    public int getAno() { return ano; }
    public void setAno(int ano) { this.ano = ano; }
    public List<ClientePagamentoDTO> getClientes() { return clientes; }
    public void setClientes(List<ClientePagamentoDTO> clientes) { this.clientes = clientes; }
    public List<DespesaMensalDTO> getDespesas() { return despesas; }
    public void setDespesas(List<DespesaMensalDTO> despesas) { this.despesas = despesas; }
}
