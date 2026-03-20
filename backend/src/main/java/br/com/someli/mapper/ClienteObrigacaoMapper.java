package br.com.someli.mapper;

import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.dto.ClienteObrigacaoDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ClienteObrigacaoMapper {

    @Mapping(source = "cliente.id", target = "clienteId")
    @Mapping(source = "obrigacao.id", target = "obrigacaoId")
    @Mapping(source = "obrigacao.nome", target = "obrigacaoNome")
    @Mapping(source = "obrigacao.tipo", target = "obrigacaoTipo")
    @Mapping(target = "status", ignore = true)
    ClienteObrigacaoDTO toDto(ClienteObrigacao clienteObrigacao);
}
