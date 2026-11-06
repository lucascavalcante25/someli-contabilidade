package br.com.someli.domain;

import br.com.someli.exception.RegraNegocioException;

import java.util.Locale;
import java.util.Map;

/** Tipos (áreas) de obrigação. Cada tipo define o setor que recebe as ocorrências. */
public final class TipoObrigacao {
    public static final String FISCAL = "FISCAL";
    public static final String CONTABIL = "CONTABIL";
    public static final String PESSOAL = "PESSOAL";
    public static final String SOCIETARIO = "SOCIETARIO";
    public static final String LICENCA = "LICENCA";
    public static final String OUTROS = "OUTROS";

    private static final Map<String, String> SETOR_POR_TIPO = Map.of(
            FISCAL, SetorResponsabilidade.FISCAL,
            CONTABIL, SetorResponsabilidade.CONTABIL,
            PESSOAL, SetorResponsabilidade.DEPARTAMENTO_PESSOAL,
            SOCIETARIO, SetorResponsabilidade.SOCIETARIO,
            LICENCA, SetorResponsabilidade.SOCIETARIO,
            OUTROS, SetorResponsabilidade.OUTROS);

    private TipoObrigacao() {
    }

    /** Tipo em maiúsculas; vazio vira FISCAL; desconhecido é recusado. */
    public static String normalizar(String tipo) {
        if (tipo == null || tipo.isBlank()) return FISCAL;
        String t = tipo.trim().toUpperCase(Locale.ROOT);
        if (!SETOR_POR_TIPO.containsKey(t)) {
            throw new RegraNegocioException("Tipo de obrigação inválido. Use Fiscal, Contábil, Pessoal, Societário, Licença ou Outros");
        }
        return t;
    }

    public static String setor(String tipo) {
        return SETOR_POR_TIPO.getOrDefault(tipo, SetorResponsabilidade.OUTROS);
    }
}
