package br.com.someli.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class SintegraDTO {

    private Integer code;

    @JsonProperty("codeMessage")
    @JsonAlias("code_message")
    private String codeMessage;

    private Map<String, Object> header;

    @JsonProperty("dataCount")
    @JsonAlias("data_count")
    private Integer dataCount;

    private List<SintegraDataDTO> data;
    private List<String> errors;

    @JsonProperty("siteReceipts")
    @JsonAlias("site_receipts")
    private List<String> siteReceipts;

    public Integer getCode() {
        return code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public String getCodeMessage() {
        return codeMessage;
    }

    public void setCodeMessage(String codeMessage) {
        this.codeMessage = codeMessage;
    }

    public Map<String, Object> getHeader() {
        return header;
    }

    public void setHeader(Map<String, Object> header) {
        this.header = header;
    }

    public Integer getDataCount() {
        return dataCount;
    }

    public void setDataCount(Integer dataCount) {
        this.dataCount = dataCount;
    }

    public List<SintegraDataDTO> getData() {
        return data;
    }

    public void setData(List<SintegraDataDTO> data) {
        this.data = data;
    }

    public List<String> getErrors() {
        return errors;
    }

    public void setErrors(List<String> errors) {
        this.errors = errors;
    }

    public List<String> getSiteReceipts() {
        return siteReceipts;
    }

    public void setSiteReceipts(List<String> siteReceipts) {
        this.siteReceipts = siteReceipts;
    }
}
