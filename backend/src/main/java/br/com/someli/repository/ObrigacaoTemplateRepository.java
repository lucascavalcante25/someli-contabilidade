package br.com.someli.repository;

import br.com.someli.domain.ObrigacaoTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ObrigacaoTemplateRepository extends JpaRepository<ObrigacaoTemplate, Long> {

    List<ObrigacaoTemplate> findByAtivoTrueOrderByRegimeAscNomeAsc();

    Optional<ObrigacaoTemplate> findByCodigoAndAtivoTrue(String codigo);

    List<ObrigacaoTemplate> findByRegimeAndAtivoTrueOrderByNomeAsc(String regime);

    @Query("SELECT DISTINCT t FROM ObrigacaoTemplate t LEFT JOIN FETCH t.itens i LEFT JOIN FETCH i.obrigacao WHERE t.codigo = :codigo AND t.ativo = TRUE")
    Optional<ObrigacaoTemplate> findByCodigoWithItens(@Param("codigo") String codigo);

    @Query("SELECT DISTINCT t FROM ObrigacaoTemplate t LEFT JOIN FETCH t.itens i LEFT JOIN FETCH i.obrigacao WHERE t.ativo = TRUE ORDER BY t.regime, t.nome")
    List<ObrigacaoTemplate> findAllAtivosWithItens();
}
