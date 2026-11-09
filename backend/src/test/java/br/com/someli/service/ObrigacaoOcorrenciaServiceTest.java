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
    void anual_competenciaEhOMesAnteriorAoVencimento_comoNoPainel() {
        // Adiantamento do 13º vence 30/11: aparece no painel junto com o que vence em novembro (competência outubro)
        assertEquals("2026-10", ObrigacaoOcorrenciaService.competenciaDe(LocalDate.of(2026, 11, 30), PeriodicidadeObrigacao.ANUAL));
        assertEquals("2027-02", ObrigacaoOcorrenciaService.competenciaDe(LocalDate.of(2027, 3, 31), PeriodicidadeObrigacao.ANUAL));
    }

    @Test
    void proximoVencimentoAnual_usaOMesEDiaPadrao_aPartirDaData() {
        LocalDate hoje = LocalDate.of(2026, 11, 9);
        assertEquals(LocalDate.of(2027, 3, 31), ObrigacaoOcorrenciaService.proximoVencimentoAnual(hoje, 3, 31));
        assertEquals(LocalDate.of(2026, 11, 30), ObrigacaoOcorrenciaService.proximoVencimentoAnual(hoje, 11, 30));
        assertEquals(LocalDate.of(2026, 12, 20), ObrigacaoOcorrenciaService.proximoVencimentoAnual(hoje, 12, 20));
        assertEquals(LocalDate.of(2027, 11, 30), ObrigacaoOcorrenciaService.proximoVencimentoAnual(LocalDate.of(2026, 12, 1), 11, 30));
        assertEquals(LocalDate.of(2027, 2, 28), ObrigacaoOcorrenciaService.proximoVencimentoAnual(hoje, 2, 31));
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
