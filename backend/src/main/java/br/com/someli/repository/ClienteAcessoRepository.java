package br.com.someli.repository;

import br.com.someli.domain.ClienteAcesso;
import br.com.someli.dto.FichaItemSetor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClienteAcessoRepository extends JpaRepository<ClienteAcesso, Long> {

    @Query("""
            SELECT a FROM ClienteAcesso a
            LEFT JOIN FETCH a.atualizadoPor
            WHERE a.cliente.id = :clienteId AND a.ativo = true
            ORDER BY a.sistema
            """)
    List<ClienteAcesso> findAtivosByClienteId(@Param("clienteId") Long clienteId);

    @Query("""
            SELECT a FROM ClienteAcesso a
            JOIN FETCH a.cliente
            LEFT JOIN FETCH a.atualizadoPor
            WHERE a.id = :id
            """)
    Optional<ClienteAcesso> findDetalheById(@Param("id") Long id);

    @Query("""
            SELECT a FROM ClienteAcesso a
            JOIN FETCH a.cliente
            WHERE a.cliente.id = :clienteId AND a.origem = 'TRELLO' AND lower(a.sistema) = lower(:sistema)
            """)
    List<ClienteAcesso> findTrelloPorSistema(@Param("clienteId") Long clienteId, @Param("sistema") String sistema);

    @Query("SELECT new br.com.someli.dto.FichaItemSetor(a.cliente.id, a.setor) FROM ClienteAcesso a WHERE a.ativo = true")
    List<FichaItemSetor> listarSetoresAtivos();
}
