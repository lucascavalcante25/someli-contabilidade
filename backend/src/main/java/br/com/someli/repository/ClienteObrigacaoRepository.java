package br.com.someli.repository;

import br.com.someli.domain.ClienteObrigacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ClienteObrigacaoRepository extends JpaRepository<ClienteObrigacao, Long> {

    @Query("SELECT co FROM ClienteObrigacao co JOIN FETCH co.cliente JOIN FETCH co.obrigacao WHERE co.id = :id")
    Optional<ClienteObrigacao> findByIdWithObrigacao(@Param("id") Long id);

    @Query("SELECT co FROM ClienteObrigacao co JOIN FETCH co.cliente JOIN FETCH co.obrigacao WHERE co.cliente.id = :clienteId AND co.ativo = true ORDER BY co.dataVencimento ASC")
    List<ClienteObrigacao> findByClienteIdAndAtivoTrueOrderByDataVencimentoAsc(@Param("clienteId") Long clienteId);

    @Query("SELECT co FROM ClienteObrigacao co JOIN FETCH co.cliente JOIN FETCH co.obrigacao WHERE co.cliente.id = :clienteId AND co.ativo = false ORDER BY co.dataVencimento DESC")
    List<ClienteObrigacao> findByClienteIdAndAtivoFalseOrderByDataVencimentoDesc(@Param("clienteId") Long clienteId);

    @Query("SELECT co FROM ClienteObrigacao co JOIN FETCH co.cliente JOIN FETCH co.obrigacao WHERE co.cliente.id = :clienteId ORDER BY co.ativo DESC, co.dataVencimento ASC")
    List<ClienteObrigacao> findByClienteIdOrderByAtivoDescDataVencimentoAsc(@Param("clienteId") Long clienteId);

    @Query("SELECT co FROM ClienteObrigacao co JOIN FETCH co.cliente JOIN FETCH co.obrigacao WHERE co.ativo = true AND co.dataVencimento <= :ate ORDER BY co.dataVencimento ASC")
    List<ClienteObrigacao> findAtivasComVencimentoAte(@Param("ate") LocalDate ate);

    @Query("SELECT co FROM ClienteObrigacao co WHERE co.ativo = true AND co.dataVencimento = :data ORDER BY co.dataVencimento ASC")
    List<ClienteObrigacao> findVencendoNaData(LocalDate data);

    boolean existsByClienteIdAndObrigacaoIdAndDataVencimentoAndAtivoTrue(Long clienteId, Long obrigacaoId, LocalDate dataVencimento);

    boolean existsByClienteIdAndObrigacaoIdAndDataVencimentoAndAtivoTrueAndIdNot(Long clienteId, Long obrigacaoId, LocalDate dataVencimento, Long idIgnorado);
}
