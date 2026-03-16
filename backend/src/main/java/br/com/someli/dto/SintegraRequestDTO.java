package br.com.someli.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SintegraRequestDTO {
    private String cnpj;
    private String uf;
    private String ie;

    @JsonProperty("ieProdutor")
    private String ieProdutor;

    private String cpf;

    public String getCnpj() {
        return cnpj;
    }

    public void setCnpj(String cnpj) {
        this.cnpj = cnpj;
    }

    public String getUf() {
        return uf;
    }

    public void setUf(String uf) {
        this.uf = uf;
    }

    public String getIe() {
        return ie;
    }

    public void setIe(String ie) {
        this.ie = ie;
    }

    public String getIeProdutor() {
        return ieProdutor;
    }

    public void setIeProdutor(String ieProdutor) {
        this.ieProdutor = ieProdutor;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }
}
