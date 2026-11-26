package br.com.someli.repository;

import br.com.someli.domain.SimulacaoRtcCenario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SimulacaoRtcCenarioRepository extends JpaRepository<SimulacaoRtcCenario, Long> {

    @Query("""
            SELECT c FROM SimulacaoRtcCenario c
            LEFT JOIN FETCH c.criadoPor
            WHERE c.cliente.id = :clienteId AND c.ativo = true
            ORDER BY c.criadoEm DESC, c.id DESC
            """)
    List<SimulacaoRtcCenario> findAtivosByClienteId(@Param("clienteId") Long clienteId);

    @Query("""
            SELECT c FROM SimulacaoRtcCenario c
            JOIN FETCH c.cliente
            LEFT JOIN FETCH c.criadoPor
            WHERE c.id = :id
            """)
    Optional<SimulacaoRtcCenario> findDetalheById(@Param("id") Long id);
}
