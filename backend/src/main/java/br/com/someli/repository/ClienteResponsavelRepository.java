package br.com.someli.repository;

import br.com.someli.domain.ClienteResponsavel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ClienteResponsavelRepository extends JpaRepository<ClienteResponsavel, Long> {

    @Query("""
            SELECT cr FROM ClienteResponsavel cr
            JOIN FETCH cr.usuario
            WHERE cr.cliente.id = :clienteId AND cr.ativo = true
            ORDER BY cr.setor
            """)
    List<ClienteResponsavel> findAtivosByClienteId(Long clienteId);

    @Query("""
            SELECT cr FROM ClienteResponsavel cr
            JOIN FETCH cr.cliente
            WHERE cr.usuario.id = :usuarioId AND cr.ativo = true
            """)
    List<ClienteResponsavel> findAtivosByUsuarioId(Long usuarioId);

    Optional<ClienteResponsavel> findByClienteIdAndSetorAndAtivoTrue(Long clienteId, String setor);

    boolean existsByClienteIdAndUsuarioIdAndAtivoTrue(Long clienteId, Long usuarioId);

    boolean existsByClienteIdAndUsuarioIdAndSetorAndAtivoTrue(Long clienteId, Long usuarioId, String setor);

    @Query("""
            SELECT DISTINCT cr.cliente.id FROM ClienteResponsavel cr
            WHERE cr.usuario.id = :usuarioId AND cr.ativo = true
            """)
    List<Long> findClienteIdsByUsuarioId(Long usuarioId);

    @Query("""
            SELECT DISTINCT cr.cliente.id FROM ClienteResponsavel cr
            WHERE cr.usuario.id = :usuarioId AND cr.ativo = true AND cr.setor = :setor
            """)
    List<Long> findClienteIdsByUsuarioIdAndSetor(Long usuarioId, String setor);
}
