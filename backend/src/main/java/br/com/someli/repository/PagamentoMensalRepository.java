package br.com.someli.repository;

import br.com.someli.domain.PagamentoMensal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PagamentoMensalRepository extends JpaRepository<PagamentoMensal, Long> {

    Optional<PagamentoMensal> findByClienteIdAndMesAndAno(Long clienteId, int mes, int ano);

    List<PagamentoMensal> findByClienteId(Long clienteId);

    List<PagamentoMensal> findByMesAndAno(int mes, int ano);
}
