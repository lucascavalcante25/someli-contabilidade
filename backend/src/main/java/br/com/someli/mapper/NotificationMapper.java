package br.com.someli.mapper;

import br.com.someli.domain.Notification;
import br.com.someli.dto.NotificationDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    @Mapping(source = "clienteObrigacao.id", target = "clienteObrigacaoId")
    @Mapping(source = "clienteObrigacao.cliente.id", target = "clienteId")
    NotificationDTO toDto(Notification notification);
}
