package br.com.someli.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CnpjResponseDTO {

    private String status;
    private String cnpj;
    private String nome;
    private String fantasia;
    private String abertura;
    private String situacao;
    private String tipo;
    private String porte;
    private String logradouro;
    private String numero;
    private String bairro;
    private String municipio;
    private String uf;
    private String cep;

    @JsonProperty("atividade_principal")
    private List<AtividadeDTO> atividadePrincipal;

    @JsonProperty("atividades_secundarias")
    private List<AtividadeDTO> atividadesSecundarias;

    private List<QsaDTO> qsa;
    private SimplesDTO simples;
    private BillingDTO billing;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCnpj() {
        return cnpj;
    }

    public void setCnpj(String cnpj) {
        this.cnpj = cnpj;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getFantasia() {
        return fantasia;
    }

    public void setFantasia(String fantasia) {
        this.fantasia = fantasia;
    }

    public String getAbertura() {
        return abertura;
    }

    public void setAbertura(String abertura) {
        this.abertura = abertura;
    }

    public String getSituacao() {
        return situacao;
    }

    public void setSituacao(String situacao) {
        this.situacao = situacao;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getPorte() {
        return porte;
    }

    public void setPorte(String porte) {
        this.porte = porte;
    }

    public String getLogradouro() {
        return logradouro;
    }

    public void setLogradouro(String logradouro) {
        this.logradouro = logradouro;
    }

    public String getNumero() {
        return numero;
    }

    public void setNumero(String numero) {
        this.numero = numero;
    }

    public String getBairro() {
        return bairro;
    }

    public void setBairro(String bairro) {
        this.bairro = bairro;
    }

    public String getMunicipio() {
        return municipio;
    }

    public void setMunicipio(String municipio) {
        this.municipio = municipio;
    }

    public String getUf() {
        return uf;
    }

    public void setUf(String uf) {
        this.uf = uf;
    }

    public String getCep() {
        return cep;
    }

    public void setCep(String cep) {
        this.cep = cep;
    }

    public List<AtividadeDTO> getAtividadePrincipal() {
        return atividadePrincipal;
    }

    public void setAtividadePrincipal(List<AtividadeDTO> atividadePrincipal) {
        this.atividadePrincipal = atividadePrincipal;
    }

    public List<AtividadeDTO> getAtividadesSecundarias() {
        return atividadesSecundarias;
    }

    public void setAtividadesSecundarias(List<AtividadeDTO> atividadesSecundarias) {
        this.atividadesSecundarias = atividadesSecundarias;
    }

    public List<QsaDTO> getQsa() {
        return qsa;
    }

    public void setQsa(List<QsaDTO> qsa) {
        this.qsa = qsa;
    }

    public SimplesDTO getSimples() {
        return simples;
    }

    public void setSimples(SimplesDTO simples) {
        this.simples = simples;
    }

    public BillingDTO getBilling() {
        return billing;
    }

    public void setBilling(BillingDTO billing) {
        this.billing = billing;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AtividadeDTO {
        private String code;
        private String text;

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class QsaDTO {
        @JsonProperty("nome")
        private String nome;

        @JsonProperty("qual")
        private String qualificacao;

        public String getNome() {
            return nome;
        }

        public void setNome(String nome) {
            this.nome = nome;
        }

        public String getQualificacao() {
            return qualificacao;
        }

        public void setQualificacao(String qualificacao) {
            this.qualificacao = qualificacao;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SimplesDTO {
        private String optante;

        @JsonProperty("data_opcao")
        private String dataOpcao;

        @JsonProperty("data_exclusao")
        private String dataExclusao;

        @JsonProperty("ultima_atualizacao")
        private String ultimaAtualizacao;

        @JsonProperty("simei")
        private SimeiDTO simei;

        public String getOptante() {
            return optante;
        }

        public void setOptante(String optante) {
            this.optante = optante;
        }

        public String getDataOpcao() {
            return dataOpcao;
        }

        public void setDataOpcao(String dataOpcao) {
            this.dataOpcao = dataOpcao;
        }

        public String getDataExclusao() {
            return dataExclusao;
        }

        public void setDataExclusao(String dataExclusao) {
            this.dataExclusao = dataExclusao;
        }

        public String getUltimaAtualizacao() {
            return ultimaAtualizacao;
        }

        public void setUltimaAtualizacao(String ultimaAtualizacao) {
            this.ultimaAtualizacao = ultimaAtualizacao;
        }

        public SimeiDTO getSimei() {
            return simei;
        }

        public void setSimei(SimeiDTO simei) {
            this.simei = simei;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SimeiDTO {
        private String optante;

        @JsonProperty("data_opcao")
        private String dataOpcao;

        @JsonProperty("data_exclusao")
        private String dataExclusao;

        public String getOptante() {
            return optante;
        }

        public void setOptante(String optante) {
            this.optante = optante;
        }

        public String getDataOpcao() {
            return dataOpcao;
        }

        public void setDataOpcao(String dataOpcao) {
            this.dataOpcao = dataOpcao;
        }

        public String getDataExclusao() {
            return dataExclusao;
        }

        public void setDataExclusao(String dataExclusao) {
            this.dataExclusao = dataExclusao;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BillingDTO {
        private Boolean free;
        private Boolean database;

        public Boolean getFree() {
            return free;
        }

        public void setFree(Boolean free) {
            this.free = free;
        }

        public Boolean getDatabase() {
            return database;
        }

        public void setDatabase(Boolean database) {
            this.database = database;
        }
    }
}
