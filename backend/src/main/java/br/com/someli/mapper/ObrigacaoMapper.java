package br.com.someli.mapper;

import br.com.someli.domain.Obrigacao;
import br.com.someli.dto.ObrigacaoDTO;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ObrigacaoMapper {
    ObrigacaoDTO toDto(Obrigacao obrigacao);
}
