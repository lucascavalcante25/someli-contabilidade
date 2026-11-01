package br.com.someli.repository;

import br.com.someli.domain.NotaFiscalImport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotaFiscalImportRepository extends JpaRepository<NotaFiscalImport, Long> {

    boolean existsByChaveAcesso(String chaveAcesso);

    Optional<NotaFiscalImport> findByChaveAcesso(String chaveAcesso);

    List<NotaFiscalImport> findByClienteIdOrderByDataEmissaoDescCreatedAtDesc(Long clienteId);

    List<NotaFiscalImport> findByClienteIdAndCompetenciaOrderByDataEmissaoDesc(Long clienteId, String competencia);
}
