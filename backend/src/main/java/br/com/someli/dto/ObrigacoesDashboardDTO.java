package br.com.someli.dto;

import java.util.List;

public class ObrigacoesDashboardDTO {

    private List<ClienteObrigacaoDTO> vencendoHoje;
    private List<ClienteObrigacaoDTO> vencendoEmBreve;
    private List<ClienteObrigacaoDTO> atrasadas;

    public ObrigacoesDashboardDTO() {
    }

    public ObrigacoesDashboardDTO(List<ClienteObrigacaoDTO> vencendoHoje,
                                   List<ClienteObrigacaoDTO> vencendoEmBreve,
                                   List<ClienteObrigacaoDTO> atrasadas) {
        this.vencendoHoje = vencendoHoje;
        this.vencendoEmBreve = vencendoEmBreve;
        this.atrasadas = atrasadas;
    }

    public List<ClienteObrigacaoDTO> getVencendoHoje() {
        return vencendoHoje;
    }

    public void setVencendoHoje(List<ClienteObrigacaoDTO> vencendoHoje) {
        this.vencendoHoje = vencendoHoje;
    }

    public List<ClienteObrigacaoDTO> getVencendoEmBreve() {
        return vencendoEmBreve;
    }

    public void setVencendoEmBreve(List<ClienteObrigacaoDTO> vencendoEmBreve) {
        this.vencendoEmBreve = vencendoEmBreve;
    }

    public List<ClienteObrigacaoDTO> getAtrasadas() {
        return atrasadas;
    }

    public void setAtrasadas(List<ClienteObrigacaoDTO> atrasadas) {
        this.atrasadas = atrasadas;
    }
}
