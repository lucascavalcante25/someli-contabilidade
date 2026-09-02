package br.com.someli.repository;

import br.com.someli.domain.MensagemDiaria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MensagemDiariaRepository extends JpaRepository<MensagemDiaria, Long> {
    Optional<MensagemDiaria> findByDiaAnoAndAtivoTrue(Integer diaAno);
}
