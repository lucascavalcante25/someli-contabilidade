package br.com.someli.repository;

import br.com.someli.domain.ObrigacaoOcorrenciaEvento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ObrigacaoOcorrenciaEventoRepository extends JpaRepository<ObrigacaoOcorrenciaEvento, Long> {
    List<ObrigacaoOcorrenciaEvento> findByOcorrenciaIdOrderByCreatedAtAsc(Long ocorrenciaId);
}
