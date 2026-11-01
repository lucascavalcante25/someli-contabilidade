package br.com.someli.dto;

import java.time.LocalDate;

public class CertificadoAlertaDTO {
    private Long clienteId;
    private String razaoSocial;
    private String cnpj;
    private LocalDate certificadoVencimento;
    private String certificadoTipo;
    private String status; // VENCENDO | VENCIDO
    private Long diasRestantes;

    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public String getRazaoSocial() { return razaoSocial; }
    public void setRazaoSocial(String razaoSocial) { this.razaoSocial = razaoSocial; }
    public String getCnpj() { return cnpj; }
    public void setCnpj(String cnpj) { this.cnpj = cnpj; }
    public LocalDate getCertificadoVencimento() { return certificadoVencimento; }
    public void setCertificadoVencimento(LocalDate certificadoVencimento) { this.certificadoVencimento = certificadoVencimento; }
    public String getCertificadoTipo() { return certificadoTipo; }
    public void setCertificadoTipo(String certificadoTipo) { this.certificadoTipo = certificadoTipo; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getDiasRestantes() { return diasRestantes; }
    public void setDiasRestantes(Long diasRestantes) { this.diasRestantes = diasRestantes; }
}
