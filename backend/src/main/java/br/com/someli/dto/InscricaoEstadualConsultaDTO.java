package br.com.someli.dto;

import java.util.List;

public record InscricaoEstadualConsultaDTO(
        String cnpj,
        String razaoSocial,
        String situacaoCadastral,
        boolean optanteSimples,
        String dataOpcaoSimples,
        String dataExclusaoSimples,
        boolean optanteMei,
        String dataOpcaoMei,
        String dataExclusaoMei,
        String simplesAtualizadoEm,
        List<Inscricao> inscricoes
) {
    public record Inscricao(String inscricao, boolean ativa, String uf, String atualizadoEm) {
    }
}
