package br.com.someli.mapper;

import br.com.someli.domain.Usuario;
import br.com.someli.dto.UsuarioDTO;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UsuarioMapper {
    UsuarioDTO toDto(Usuario usuario);
}
