package br.com.someli.mapper;

import br.com.someli.domain.Cliente;
import br.com.someli.dto.ClienteDTO;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ClienteMapper {
    ClienteDTO toDto(Cliente cliente);
}
