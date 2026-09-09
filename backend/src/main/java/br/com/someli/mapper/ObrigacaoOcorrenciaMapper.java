package br.com.someli.mapper;

import br.com.someli.domain.ObrigacaoOcorrencia;
import br.com.someli.dto.ObrigacaoOcorrenciaDTO;

/** Mapeamento único das ocorrências (Meu Trabalho + endpoints). */
public final class ObrigacaoOcorrenciaMapper {

    private ObrigacaoOcorrenciaMapper() {
    }

    public static ObrigacaoOcorrenciaDTO toDto(ObrigacaoOcorrencia oo) {
        ObrigacaoOcorrenciaDTO dto = new ObrigacaoOcorrenciaDTO();
        if (oo == null || oo.getClienteObrigacao() == null) {
            return dto;
        }
        var co = oo.getClienteObrigacao();
        dto.setId(oo.getId());
        dto.setClienteObrigacaoId(co.getId());
        if (co.getCliente() != null) {
            dto.setClienteId(co.getCliente().getId());
            dto.setClienteNome(co.getCliente().getRazaoSocial());
        }
        if (co.getObrigacao() != null) {
            dto.setObrigacaoId(co.getObrigacao().getId());
            dto.setObrigacaoNome(co.getObrigacao().getNome());
            dto.setUrlPortal(co.getObrigacao().getUrlPortal());
        }
        dto.setSetor(co.resolverSetor());
        dto.setCompetencia(oo.getCompetencia());
        dto.setDataVencimento(oo.getDataVencimento());
        dto.setStatus(oo.getStatus());
        dto.setObservacao(oo.getObservacao());
        dto.setPeriodicidade(co.getPeriodicidade());
        dto.setConcluidaEm(oo.getConcluidaEm());
        if (oo.getConcluidaPor() != null) {
            dto.setConcluidaPorNome(oo.getConcluidaPor().getNome());
        }
        return dto;
    }
}
