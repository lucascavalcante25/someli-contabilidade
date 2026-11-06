package br.com.someli.domain;

/** Códigos de regras de tags derivadas de estado (sincronizadas automaticamente). */
public final class TagRegra {
    public static final String NOVO_CLIENTE = "NOVO_CLIENTE";
    public static final String INADIMPLENTE = "INADIMPLENTE";
    /** Tag igual ao regime tributário do cliente (MEI, SIMPLES_NACIONAL, LUCRO_PRESUMIDO, LUCRO_REAL). */
    public static final String REGIME = "REGIME";

    private TagRegra() {
    }
}
