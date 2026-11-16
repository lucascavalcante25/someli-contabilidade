package br.com.someli.repository;

import br.com.someli.domain.Profissao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProfissaoRepository extends JpaRepository<Profissao, Long> {
    Optional<Profissao> findByNomeIgnoreCase(String nome);
}
