package br.com.someli.dto;

public class UpdateChecklistRequestDTO {
    private Boolean docsOk;
    private Boolean apurado;
    private Boolean transmitido;
    private Boolean guiaEnviada;

    public Boolean getDocsOk() { return docsOk; }
    public void setDocsOk(Boolean docsOk) { this.docsOk = docsOk; }
    public Boolean getApurado() { return apurado; }
    public void setApurado(Boolean apurado) { this.apurado = apurado; }
    public Boolean getTransmitido() { return transmitido; }
    public void setTransmitido(Boolean transmitido) { this.transmitido = transmitido; }
    public Boolean getGuiaEnviada() { return guiaEnviada; }
    public void setGuiaEnviada(Boolean guiaEnviada) { this.guiaEnviada = guiaEnviada; }
}
