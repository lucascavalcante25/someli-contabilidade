package br.com.someli.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/** A V41 roda em produção com validate: precisa ser idempotente e bater com a entidade SimulacaoRtcCenario. */
class MigrationSimuladorRtcTest {

    private static final Path V41 = Path.of("src/main/resources/db/migration/V41__simulador_rtc.sql");

    @Test
    void v41EhIdempotente() throws IOException {
        String sql = Files.readString(V41, StandardCharsets.UTF_8);
        assertThat(sql).contains("CREATE TABLE IF NOT EXISTS simulacao_rtc_cenario");
        assertThat(sql).contains("CREATE INDEX IF NOT EXISTS");
        assertThat(sql.split("ON CONFLICT", -1)).as("todo INSERT com ON CONFLICT").hasSize(3);
        assertThat(sql.toLowerCase()).doesNotContain("smallint").doesNotContain("drop ");
    }

    @Test
    void v41TemAsColunasDaEntidade() throws IOException {
        String sql = Files.readString(V41, StandardCharsets.UTF_8);
        for (String coluna : new String[]{"cliente_id", "nome", "regime", "observacao", "entrada", "resultado",
                "versao_calculadora", "versao_base", "aviso_dados_simulados", "ativo", "criado_em",
                "criado_por_id", "atualizado_em"}) {
            assertThat(sql).as(coluna).containsPattern("\\n\\s+" + coluna + "\\s");
        }
        assertThat(sql).contains("SIMULADOR_RTC_USAR");
    }
}
