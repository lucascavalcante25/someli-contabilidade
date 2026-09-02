package br.com.someli.mapper;

import br.com.someli.domain.Cliente;
import br.com.someli.dto.ClienteDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ClienteMapper {
    @Mapping(source = "responsavel.id", target = "responsavelId")
    @Mapping(source = "responsavel.nome", target = "responsavelNome")
    ClienteDTO toDto(Cliente cliente);
}
