package br.com.someli.dto;

import java.util.List;

public class MeuTrabalhoDTO {
    private long vencendoHoje;
    private long vencendoProximosDias;
    private long atrasadas;
    private long aguardandoCliente;
    private long notificacoesNaoLidas;
    private long empresasNaCarteira;
    private List<ObrigacaoOcorrenciaDTO> obrigacoesProximas;
    private List<ObrigacaoOcorrenciaDTO> obrigacoesAtrasadas;
    private VisaoGerencialDTO visaoGerencial;

    public long getVencendoHoje() { return vencendoHoje; }
    public void setVencendoHoje(long vencendoHoje) { this.vencendoHoje = vencendoHoje; }
    public long getVencendoProximosDias() { return vencendoProximosDias; }
    public void setVencendoProximosDias(long vencendoProximosDias) { this.vencendoProximosDias = vencendoProximosDias; }
    public long getAtrasadas() { return atrasadas; }
    public void setAtrasadas(long atrasadas) { this.atrasadas = atrasadas; }
    public long getAguardandoCliente() { return aguardandoCliente; }
    public void setAguardandoCliente(long aguardandoCliente) { this.aguardandoCliente = aguardandoCliente; }
    public long getNotificacoesNaoLidas() { return notificacoesNaoLidas; }
    public void setNotificacoesNaoLidas(long notificacoesNaoLidas) { this.notificacoesNaoLidas = notificacoesNaoLidas; }
    public long getEmpresasNaCarteira() { return empresasNaCarteira; }
    public void setEmpresasNaCarteira(long empresasNaCarteira) { this.empresasNaCarteira = empresasNaCarteira; }
    public List<ObrigacaoOcorrenciaDTO> getObrigacoesProximas() { return obrigacoesProximas; }
    public void setObrigacoesProximas(List<ObrigacaoOcorrenciaDTO> obrigacoesProximas) { this.obrigacoesProximas = obrigacoesProximas; }
    public List<ObrigacaoOcorrenciaDTO> getObrigacoesAtrasadas() { return obrigacoesAtrasadas; }
    public void setObrigacoesAtrasadas(List<ObrigacaoOcorrenciaDTO> obrigacoesAtrasadas) { this.obrigacoesAtrasadas = obrigacoesAtrasadas; }
    public VisaoGerencialDTO getVisaoGerencial() { return visaoGerencial; }
    public void setVisaoGerencial(VisaoGerencialDTO visaoGerencial) { this.visaoGerencial = visaoGerencial; }

    public static class VisaoGerencialDTO {
        private long totalMes;
        private long concluidas;
        private long pendentes;
        private long aguardandoCliente;
        private long atrasadas;
        private List<SetorPctDTO> porSetor;
        private long clientesSemResponsavel;

        public long getTotalMes() { return totalMes; }
        public void setTotalMes(long totalMes) { this.totalMes = totalMes; }
        public long getConcluidas() { return concluidas; }
        public void setConcluidas(long concluidas) { this.concluidas = concluidas; }
        public long getPendentes() { return pendentes; }
        public void setPendentes(long pendentes) { this.pendentes = pendentes; }
        public long getAguardandoCliente() { return aguardandoCliente; }
        public void setAguardandoCliente(long aguardandoCliente) { this.aguardandoCliente = aguardandoCliente; }
        public long getAtrasadas() { return atrasadas; }
        public void setAtrasadas(long atrasadas) { this.atrasadas = atrasadas; }
        public List<SetorPctDTO> getPorSetor() { return porSetor; }
        public void setPorSetor(List<SetorPctDTO> porSetor) { this.porSetor = porSetor; }
        public long getClientesSemResponsavel() { return clientesSemResponsavel; }
        public void setClientesSemResponsavel(long clientesSemResponsavel) { this.clientesSemResponsavel = clientesSemResponsavel; }
    }

    public static class SetorPctDTO {
        private String setor;
        private String label;
        private long total;
        private long concluidas;
        private double percentual;

        public String getSetor() { return setor; }
        public void setSetor(String setor) { this.setor = setor; }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        public long getTotal() { return total; }
        public void setTotal(long total) { this.total = total; }
        public long getConcluidas() { return concluidas; }
        public void setConcluidas(long concluidas) { this.concluidas = concluidas; }
        public double getPercentual() { return percentual; }
        public void setPercentual(double percentual) { this.percentual = percentual; }
    }
}
