package br.com.someli.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Situação da busca de NFS-e no ADN para um cliente. Nunca inclui arquivo ou senha do certificado. */
public record NfseAdnStatusDTO(
        boolean habilitado,
        boolean agendamentoLigado,
        Certificado certificado,
        boolean ativo,
        Long ultimoNsu,
        LocalDateTime ultimaConsulta,
        LocalDateTime proximaConsulta,
        String ultimoStatus,
        String ultimaMensagem,
        long notasImportadas) {

    public record Certificado(String cnpj, String titular, LocalDate validoAte, boolean vencido, LocalDateTime enviadoEm) {
    }
}
