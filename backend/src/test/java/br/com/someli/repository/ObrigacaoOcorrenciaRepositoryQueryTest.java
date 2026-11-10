package br.com.someli.repository;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * O mapper lê oo.concluidaPor.nome fora da transação (open-in-view desligado).
 * Sem o fetch, abrir as obrigações de um cliente concluídas por outro usuário dava 500
 * (LazyInitializationException em produção, 10/11/2026).
 */
class ObrigacaoOcorrenciaRepositoryQueryTest {

    private static String jpql(String metodo, Class<?>... tipos) throws NoSuchMethodException {
        return ObrigacaoOcorrenciaRepository.class.getMethod(metodo, tipos).getAnnotation(Query.class).value();
    }

    @Test
    void ocorrenciasDoClienteTrazemQuemConcluiu() throws Exception {
        assertThat(jpql("findByClienteId", Long.class)).contains("LEFT JOIN FETCH oo.concluidaPor");
    }

    @Test
    void ocorrenciaPorIdTrazQuemConcluiu() throws Exception {
        assertThat(jpql("findByIdWithDetails", Long.class)).contains("LEFT JOIN FETCH oo.concluidaPor");
    }

    @Test
    void painelDoMesContinuaTrazendoQuemConcluiu() throws Exception {
        assertThat(jpql("findByCompetenciaWithDetails", String.class)).contains("LEFT JOIN FETCH oo.concluidaPor");
    }
}
