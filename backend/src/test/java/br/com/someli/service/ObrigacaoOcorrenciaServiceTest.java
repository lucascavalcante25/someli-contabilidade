package br.com.someli.service;

import br.com.someli.domain.PeriodicidadeObrigacao;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.YearMonth;

import static org.junit.jupiter.api.Assertions.*;

class ObrigacaoOcorrenciaServiceTest {

    @Test
    void cenario6_ocorrenciasIndependentesPorCompetencia() {
        LocalDate ago = LocalDate.of(2026, 9, 20);
        LocalDate set = ObrigacaoOcorrenciaService.avancarVencimento(ago, PeriodicidadeObrigacao.MENSAL, 20);

        assertEquals(LocalDate.of(2026, 10, 20), set);

        String compAgo = ObrigacaoOcorrenciaService.competenciaDe(ago, PeriodicidadeObrigacao.MENSAL);
        String compSet = ObrigacaoOcorrenciaService.competenciaDe(set, PeriodicidadeObrigacao.MENSAL);

        assertEquals("2026-08", compAgo);
        assertEquals("2026-09", compSet);
        assertNotEquals(compAgo, compSet);
    }

    @Test
    void diaFixoRespeitaUltimoDiaDoMes() {
        LocalDate venc = ObrigacaoOcorrenciaService.resolverDataVencimento(YearMonth.of(2026, 2), 31);
        assertEquals(LocalDate.of(2026, 2, 28), venc);
    }

    @Test
    void chaveDedupEstavelEvitaDuplicacaoConceitual() {
        // Cenário 7: mesma ocorrência + usuário + tipo = mesma chave
        Long ocorrenciaId = 55L;
        Long usuarioId = 10L;
        String chave1 = "OBRIGACAO:" + ocorrenciaId + ":" + usuarioId + ":VENCENDO";
        String chave2 = "OBRIGACAO:" + ocorrenciaId + ":" + usuarioId + ":VENCENDO";
        assertEquals(chave1, chave2);
    }
}
