package br.com.someli.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Central operacional: obrigações, DAS/PGDAS, certificados e inadimplentes.
 */
public class AlertasOperacionaisDTO {
    private long obrigacoesVencendoHoje;
    private long obrigacoesVencendoEmBreve;
    private long obrigacoesAtrasadas;
    private long dasPgdasAbertas;
    private long certificadosVencendo;
    private long certificadosVencidos;
    private long inadimplentes;

    private List<ObrigacaoOcorrenciaDTO> obrigacoesAtrasadasItens = new ArrayList<>();
    private List<ObrigacaoOcorrenciaDTO> obrigacoesProximasItens = new ArrayList<>();
    private List<ObrigacaoOcorrenciaDTO> dasPgdasItens = new ArrayList<>();
    private List<CertificadoAlertaDTO> certificados = new ArrayList<>();
    private List<ClienteResumoAlertaDTO> inadimplentesItens = new ArrayList<>();

    public long getObrigacoesVencendoHoje() { return obrigacoesVencendoHoje; }
    public void setObrigacoesVencendoHoje(long obrigacoesVencendoHoje) { this.obrigacoesVencendoHoje = obrigacoesVencendoHoje; }
    public long getObrigacoesVencendoEmBreve() { return obrigacoesVencendoEmBreve; }
    public void setObrigacoesVencendoEmBreve(long obrigacoesVencendoEmBreve) { this.obrigacoesVencendoEmBreve = obrigacoesVencendoEmBreve; }
    public long getObrigacoesAtrasadas() { return obrigacoesAtrasadas; }
    public void setObrigacoesAtrasadas(long obrigacoesAtrasadas) { this.obrigacoesAtrasadas = obrigacoesAtrasadas; }
    public long getDasPgdasAbertas() { return dasPgdasAbertas; }
    public void setDasPgdasAbertas(long dasPgdasAbertas) { this.dasPgdasAbertas = dasPgdasAbertas; }
    public long getCertificadosVencendo() { return certificadosVencendo; }
    public void setCertificadosVencendo(long certificadosVencendo) { this.certificadosVencendo = certificadosVencendo; }
    public long getCertificadosVencidos() { return certificadosVencidos; }
    public void setCertificadosVencidos(long certificadosVencidos) { this.certificadosVencidos = certificadosVencidos; }
    public long getInadimplentes() { return inadimplentes; }
    public void setInadimplentes(long inadimplentes) { this.inadimplentes = inadimplentes; }
    public List<ObrigacaoOcorrenciaDTO> getObrigacoesAtrasadasItens() { return obrigacoesAtrasadasItens; }
    public void setObrigacoesAtrasadasItens(List<ObrigacaoOcorrenciaDTO> obrigacoesAtrasadasItens) { this.obrigacoesAtrasadasItens = obrigacoesAtrasadasItens; }
    public List<ObrigacaoOcorrenciaDTO> getObrigacoesProximasItens() { return obrigacoesProximasItens; }
    public void setObrigacoesProximasItens(List<ObrigacaoOcorrenciaDTO> obrigacoesProximasItens) { this.obrigacoesProximasItens = obrigacoesProximasItens; }
    public List<ObrigacaoOcorrenciaDTO> getDasPgdasItens() { return dasPgdasItens; }
    public void setDasPgdasItens(List<ObrigacaoOcorrenciaDTO> dasPgdasItens) { this.dasPgdasItens = dasPgdasItens; }
    public List<CertificadoAlertaDTO> getCertificados() { return certificados; }
    public void setCertificados(List<CertificadoAlertaDTO> certificados) { this.certificados = certificados; }
    public List<ClienteResumoAlertaDTO> getInadimplentesItens() { return inadimplentesItens; }
    public void setInadimplentesItens(List<ClienteResumoAlertaDTO> inadimplentesItens) { this.inadimplentesItens = inadimplentesItens; }

    public static class ClienteResumoAlertaDTO {
        private Long id;
        private String razaoSocial;
        private String status;
        private Integer mesesPendentes;
        private java.math.BigDecimal valorPendente;
        /** Meses em aberto ("yyyy-MM") e honorário do mês: o Dashboard marca o pagamento de cada mês. */
        private List<String> mesesAbertos = new ArrayList<>();
        private java.math.BigDecimal honorario;

        public List<String> getMesesAbertos() { return mesesAbertos; }
        public void setMesesAbertos(List<String> mesesAbertos) { this.mesesAbertos = mesesAbertos; }
        public java.math.BigDecimal getHonorario() { return honorario; }
        public void setHonorario(java.math.BigDecimal honorario) { this.honorario = honorario; }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getRazaoSocial() { return razaoSocial; }
        public void setRazaoSocial(String razaoSocial) { this.razaoSocial = razaoSocial; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public Integer getMesesPendentes() { return mesesPendentes; }
        public void setMesesPendentes(Integer mesesPendentes) { this.mesesPendentes = mesesPendentes; }
        public java.math.BigDecimal getValorPendente() { return valorPendente; }
        public void setValorPendente(java.math.BigDecimal valorPendente) { this.valorPendente = valorPendente; }
    }
}
