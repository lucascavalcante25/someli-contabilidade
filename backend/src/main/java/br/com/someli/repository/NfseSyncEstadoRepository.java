package br.com.someli.repository;

import br.com.someli.domain.NfseSyncEstado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NfseSyncEstadoRepository extends JpaRepository<NfseSyncEstado, Long> {

    /** Traz o cliente junto: o job roda fora de transação (open-in-view desligado). */
    @Query("SELECT e FROM NfseSyncEstado e JOIN FETCH e.cliente WHERE e.cliente.id = :clienteId")
    Optional<NfseSyncEstado> findByClienteId(@Param("clienteId") Long clienteId);

    @Query("SELECT e.cliente.id FROM NfseSyncEstado e WHERE e.ativo = TRUE "
            + "AND (e.proximaConsulta IS NULL OR e.proximaConsulta <= :agora) ORDER BY e.proximaConsulta ASC NULLS FIRST")
    List<Long> findClienteIdsParaConsultar(@Param("agora") LocalDateTime agora);
}
