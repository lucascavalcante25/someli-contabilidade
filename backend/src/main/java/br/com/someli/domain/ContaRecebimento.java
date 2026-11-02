package br.com.someli.domain;

import br.com.someli.exception.RegraNegocioException;

import java.text.Normalizer;
import java.util.Locale;

/** Conta em que o honorário do cliente é recebido (coluna "S" da planilha: S = Someli, P = Patrícia). */
public final class ContaRecebimento {
    public static final String SOMELI = "SOMELI";
    public static final String PATRICIA = "PATRICIA";

    private ContaRecebimento() {
    }

    public static String normalizar(String valor) {
        if (valor == null || valor.isBlank() || "-".equals(valor.trim())) {
            return null;
        }
        String n = Normalizer.normalize(valor.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT);
        if ("S".equals(n) || SOMELI.equals(n)) {
            return SOMELI;
        }
        if ("P".equals(n) || PATRICIA.equals(n)) {
            return PATRICIA;
        }
        throw new RegraNegocioException("Conta de recebimento deve ser Someli ou Patrícia");
    }

    public static String rotulo(String conta) {
        if (SOMELI.equals(conta)) {
            return "Someli";
        }
        if (PATRICIA.equals(conta)) {
            return "Patrícia";
        }
        return null;
    }
}
