package br.com.someli.repository;

import br.com.someli.domain.Obrigacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ObrigacaoRepository extends JpaRepository<Obrigacao, Long> {

    List<Obrigacao> findAllByOrderByNomeAsc();
}
