package br.com.someli.domain;

import java.util.Set;

/** Regimes suportados nos templates operacionais do escritório. */
public final class RegimeTributario {
    public static final String MEI = "MEI";
    public static final String SIMPLES_NACIONAL = "SIMPLES_NACIONAL";
    public static final String LUCRO_PRESUMIDO = "LUCRO_PRESUMIDO";
    public static final String LUCRO_REAL = "LUCRO_REAL";
    public static final String OUTRO = "OUTRO";

    private static final Set<String> CONHECIDOS = Set.of(
            MEI, SIMPLES_NACIONAL, LUCRO_PRESUMIDO, LUCRO_REAL, OUTRO);

    private RegimeTributario() {
    }

    public static boolean isValido(String regime) {
        return regime != null && CONHECIDOS.contains(regime.trim().toUpperCase());
    }

    public static String normalizar(String regime) {
        if (regime == null || regime.isBlank()) return null;
        String n = regime.trim().toUpperCase().replace(' ', '_');
        if ("SIMPLES".equals(n) || "SN".equals(n)) return SIMPLES_NACIONAL;
        if ("PRESUMIDO".equals(n) || "LP".equals(n)) return LUCRO_PRESUMIDO;
        if ("REAL".equals(n) || "LR".equals(n)) return LUCRO_REAL;
        return CONHECIDOS.contains(n) ? n : OUTRO;
    }
}
