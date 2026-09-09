package br.com.someli.repository;

import br.com.someli.domain.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    boolean existsByCnpj(String cnpj);
    boolean existsByCnpjAndIdNot(String cnpj, Long id);

    @Query("SELECT DISTINCT c FROM Cliente c LEFT JOIN FETCH c.responsavel LEFT JOIN FETCH c.tags ORDER BY c.razaoSocial ASC")
    List<Cliente> findAllWithResponsavel();

    @Query("SELECT c FROM Cliente c LEFT JOIN FETCH c.responsavel LEFT JOIN FETCH c.tags WHERE c.id = :id")
    Optional<Cliente> findByIdWithResponsavel(@Param("id") Long id);

    @Query("SELECT DISTINCT c.id FROM Cliente c JOIN c.tags t WHERE t.id = :tagId")
    List<Long> findClienteIdsByTagId(@Param("tagId") Long tagId);
}
