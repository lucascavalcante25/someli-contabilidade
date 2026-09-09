package br.com.someli.repository;

import br.com.someli.domain.ObrigacaoOcorrencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ObrigacaoOcorrenciaRepository extends JpaRepository<ObrigacaoOcorrencia, Long> {

    @Query("""
            SELECT oo FROM ObrigacaoOcorrencia oo
            JOIN FETCH oo.clienteObrigacao co
            JOIN FETCH co.obrigacao
            JOIN FETCH co.cliente
            WHERE co.cliente.id = :clienteId
            ORDER BY oo.dataVencimento ASC
            """)
    List<ObrigacaoOcorrencia> findByClienteId(Long clienteId);

    @Query("""
            SELECT oo FROM ObrigacaoOcorrencia oo
            JOIN FETCH oo.clienteObrigacao co
            JOIN FETCH co.obrigacao
            JOIN FETCH co.cliente
            WHERE oo.id = :id
            """)
    Optional<ObrigacaoOcorrencia> findByIdWithDetails(Long id);

    @Query("""
            SELECT oo FROM ObrigacaoOcorrencia oo
            JOIN FETCH oo.clienteObrigacao co
            JOIN FETCH co.obrigacao
            JOIN FETCH co.cliente
            WHERE co.ativo = true
              AND oo.status NOT IN ('CONCLUIDA', 'ENTREGUE', 'NAO_APLICAVEL')
              AND oo.dataVencimento <= :ate
            ORDER BY oo.dataVencimento ASC
            """)
    List<ObrigacaoOcorrencia> findAbertasComVencimentoAte(LocalDate ate);

    @Query("""
            SELECT oo FROM ObrigacaoOcorrencia oo
            JOIN FETCH oo.clienteObrigacao co
            JOIN FETCH co.obrigacao
            JOIN FETCH co.cliente
            WHERE co.ativo = true
              AND oo.dataVencimento = :data
              AND oo.status NOT IN ('CONCLUIDA', 'ENTREGUE', 'NAO_APLICAVEL')
            """)
    List<ObrigacaoOcorrencia> findAbertasNaData(LocalDate data);

    boolean existsByClienteObrigacaoIdAndCompetencia(Long clienteObrigacaoId, String competencia);

    @Query("""
            SELECT COUNT(oo) FROM ObrigacaoOcorrencia oo
            JOIN oo.clienteObrigacao co
            WHERE co.ativo = true
              AND oo.competencia = :competencia
              AND oo.status = :status
            """)
    long countByCompetenciaAndStatus(String competencia, String status);

    @Query("""
            SELECT COUNT(oo) FROM ObrigacaoOcorrencia oo
            JOIN oo.clienteObrigacao co
            WHERE co.ativo = true AND oo.competencia = :competencia
            """)
    long countByCompetencia(String competencia);

    List<ObrigacaoOcorrencia> findByClienteObrigacaoIdOrderByDataVencimentoDesc(Long clienteObrigacaoId);
}
