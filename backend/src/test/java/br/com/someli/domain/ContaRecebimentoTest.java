package br.com.someli.domain;

import br.com.someli.exception.RegraNegocioException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ContaRecebimentoTest {

    @ParameterizedTest
    @CsvSource({
            "S, SOMELI",
            "s, SOMELI",
            "SOMELI, SOMELI",
            "' someli ', SOMELI",
            "P, PATRICIA",
            "p, PATRICIA",
            "PATRICIA, PATRICIA",
            "Patrícia, PATRICIA",
    })
    void normaliza_letraDaPlanilhaOuNome(String entrada, String esperado) {
        assertThat(ContaRecebimento.normalizar(entrada)).isEqualTo(esperado);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"  ", "-"})
    void vazioOuTraco_ficaSemConta(String entrada) {
        assertThat(ContaRecebimento.normalizar(entrada)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"K", "nubank", "X"})
    void valorDesconhecido_eRecusadoEmVezDeChutado(String entrada) {
        assertThatThrownBy(() -> ContaRecebimento.normalizar(entrada))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("Someli ou Patrícia");
    }

    @Test
    void rotulo_paraExibirNaTela() {
        assertThat(ContaRecebimento.rotulo("SOMELI")).isEqualTo("Someli");
        assertThat(ContaRecebimento.rotulo("PATRICIA")).isEqualTo("Patrícia");
        assertThat(ContaRecebimento.rotulo(null)).isNull();
    }
}
