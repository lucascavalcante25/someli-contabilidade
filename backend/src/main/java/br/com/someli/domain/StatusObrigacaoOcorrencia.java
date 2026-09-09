package br.com.someli.domain;

public final class StatusObrigacaoOcorrencia {
    public static final String PENDENTE = "PENDENTE";
    public static final String EM_ANDAMENTO = "EM_ANDAMENTO";
    public static final String AGUARDANDO_CLIENTE = "AGUARDANDO_CLIENTE";
    public static final String CONCLUIDA = "CONCLUIDA";
    public static final String ENTREGUE = "ENTREGUE";
    public static final String ATRASADA = "ATRASADA";
    public static final String NAO_APLICAVEL = "NAO_APLICAVEL";

    private StatusObrigacaoOcorrencia() {
    }

    public static boolean isFinal(String status) {
        return CONCLUIDA.equals(status) || ENTREGUE.equals(status) || NAO_APLICAVEL.equals(status);
    }
}
