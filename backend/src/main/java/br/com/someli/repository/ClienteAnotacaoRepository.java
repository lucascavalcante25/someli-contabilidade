package br.com.someli.repository;

import br.com.someli.domain.ClienteAnotacao;
import br.com.someli.dto.FichaItemSetor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClienteAnotacaoRepository extends JpaRepository<ClienteAnotacao, Long> {

    @Query("""
            SELECT a FROM ClienteAnotacao a
            LEFT JOIN FETCH a.atualizadoPor
            WHERE a.cliente.id = :clienteId AND a.ativo = true
            ORDER BY a.fixada DESC, a.atualizadoEm DESC, a.id DESC
            """)
    List<ClienteAnotacao> findAtivosByClienteId(@Param("clienteId") Long clienteId);

    @Query("""
            SELECT a FROM ClienteAnotacao a
            JOIN FETCH a.cliente
            LEFT JOIN FETCH a.atualizadoPor
            WHERE a.id = :id
            """)
    Optional<ClienteAnotacao> findDetalheById(@Param("id") Long id);

    @Query("""
            SELECT a FROM ClienteAnotacao a
            WHERE a.cliente.id = :clienteId AND a.origem = 'TRELLO' AND a.ativo = true
            """)
    List<ClienteAnotacao> findTrelloAtivas(@Param("clienteId") Long clienteId);

    @Query("SELECT new br.com.someli.dto.FichaItemSetor(a.cliente.id, a.setor) FROM ClienteAnotacao a WHERE a.ativo = true")
    List<FichaItemSetor> listarSetoresAtivos();
}
