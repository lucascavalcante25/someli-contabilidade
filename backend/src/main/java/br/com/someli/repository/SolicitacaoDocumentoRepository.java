package br.com.someli.repository;

import br.com.someli.domain.SolicitacaoDocumento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SolicitacaoDocumentoRepository extends JpaRepository<SolicitacaoDocumento, Long> {

    @Query("select s from SolicitacaoDocumento s join fetch s.cliente where s.tokenHash = :tokenHash")
    Optional<SolicitacaoDocumento> findByTokenHash(@Param("tokenHash") String tokenHash);

    List<SolicitacaoDocumento> findByClienteIdOrderByCriadoEmDesc(Long clienteId);
}
