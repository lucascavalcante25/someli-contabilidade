package br.com.someli.repository;

import br.com.someli.domain.Despesa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DespesaRepository extends JpaRepository<Despesa, Long> {

    List<Despesa> findByAtivoTrueOrderByDescricaoAsc();
}
