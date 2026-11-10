package br.com.someli.dto;

import jakarta.validation.constraints.NotBlank;

/** Segmento do cliente no Painel do mês: SERVICOS ou COMERCIO_INDUSTRIA. */
public class DefinirSegmentoRequestDTO {
    @NotBlank(message = "Segmento é obrigatório")
    private String segmento;

    public String getSegmento() { return segmento; }
    public void setSegmento(String segmento) { this.segmento = segmento; }
}
