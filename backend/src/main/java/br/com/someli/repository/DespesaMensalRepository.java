package br.com.someli.repository;

import br.com.someli.domain.DespesaMensal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface DespesaMensalRepository extends JpaRepository<DespesaMensal, Long> {

    Optional<DespesaMensal> findByDespesaIdAndMesAndAno(Long despesaId, int mes, int ano);

    List<DespesaMensal> findByDespesaId(Long despesaId);

    List<DespesaMensal> findByMesAndAno(int mes, int ano);

    @Query("select distinct d.despesaId from DespesaMensal d where d.valor is not null")
    Set<Long> findDespesaIdsComValorMensal();
}
