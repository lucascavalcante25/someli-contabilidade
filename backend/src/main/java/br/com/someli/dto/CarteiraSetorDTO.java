package br.com.someli.dto;

import java.util.List;

/** Clientes de um usuário em um setor (para transferir a carteira quando ele sai do escritório). */
public record CarteiraSetorDTO(String setor, String setorLabel, List<ClienteDaCarteira> clientes) {

    public record ClienteDaCarteira(Long id, String nome) {
    }
}
