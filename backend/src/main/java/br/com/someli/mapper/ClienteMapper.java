package br.com.someli.mapper;

import br.com.someli.domain.CertificadoDigitalStatus;
import br.com.someli.domain.Cliente;
import br.com.someli.dto.ClienteDTO;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.time.LocalDate;

@Mapper(componentModel = "spring")
public interface ClienteMapper {
    @Mapping(source = "responsavel.id", target = "responsavelId")
    @Mapping(source = "responsavel.nome", target = "responsavelNome")
    @Mapping(target = "certificadoStatus", ignore = true)
    @Mapping(target = "certificadoDiasRestantes", ignore = true)
    ClienteDTO toDto(Cliente cliente);

    @AfterMapping
    default void enrichCertificado(Cliente source, @MappingTarget ClienteDTO target) {
        LocalDate hoje = LocalDate.now();
        CertificadoDigitalStatus st = CertificadoDigitalStatus.de(source.getCertificadoVencimento(), hoje,
                CertificadoDigitalStatus.DIAS_ALERTA_PADRAO);
        target.setCertificadoStatus(st.name());
        target.setCertificadoDiasRestantes(
                CertificadoDigitalStatus.diasRestantes(source.getCertificadoVencimento(), hoje));
    }
}
