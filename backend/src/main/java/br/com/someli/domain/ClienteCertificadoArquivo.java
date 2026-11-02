package br.com.someli.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Certificado A1 do cliente, arquivo e senha cifrados (ver CertificadoCrypto). Nunca sai pela API. */
@Entity
@Table(name = "cliente_certificado_arquivo")
public class ClienteCertificadoArquivo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false, unique = true)
    private Cliente cliente;

    @Column(name = "pfx_cifrado", nullable = false)
    private byte[] pfxCifrado;

    @Column(name = "senha_cifrada", nullable = false)
    private byte[] senhaCifrada;

    @Column(name = "cnpj_certificado", length = 14)
    private String cnpjCertificado;

    @Column(length = 200)
    private String titular;

    @Column(name = "valido_ate")
    private LocalDate validoAte;

    @Column(name = "enviado_por_id")
    private Long enviadoPorId;

    @Column(name = "enviado_em", nullable = false)
    private LocalDateTime enviadoEm;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }
    public byte[] getPfxCifrado() { return pfxCifrado; }
    public void setPfxCifrado(byte[] pfxCifrado) { this.pfxCifrado = pfxCifrado; }
    public byte[] getSenhaCifrada() { return senhaCifrada; }
    public void setSenhaCifrada(byte[] senhaCifrada) { this.senhaCifrada = senhaCifrada; }
    public String getCnpjCertificado() { return cnpjCertificado; }
    public void setCnpjCertificado(String cnpjCertificado) { this.cnpjCertificado = cnpjCertificado; }
    public String getTitular() { return titular; }
    public void setTitular(String titular) { this.titular = titular; }
    public LocalDate getValidoAte() { return validoAte; }
    public void setValidoAte(LocalDate validoAte) { this.validoAte = validoAte; }
    public Long getEnviadoPorId() { return enviadoPorId; }
    public void setEnviadoPorId(Long enviadoPorId) { this.enviadoPorId = enviadoPorId; }
    public LocalDateTime getEnviadoEm() { return enviadoEm; }
    public void setEnviadoEm(LocalDateTime enviadoEm) { this.enviadoEm = enviadoEm; }
}
