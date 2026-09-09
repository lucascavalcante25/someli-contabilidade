package br.com.someli.domain;

/**
 * Setores de responsabilidade sobre um cliente.
 * Novos valores podem ser adicionados sem alteração estrutural de tabela.
 */
public final class SetorResponsabilidade {
    public static final String FISCAL = "FISCAL";
    public static final String DEPARTAMENTO_PESSOAL = "DEPARTAMENTO_PESSOAL";
    public static final String CONTABIL = "CONTABIL";
    public static final String FINANCEIRO = "FINANCEIRO";
    public static final String GERENTE_CONTA = "GERENTE_CONTA";
    public static final String SOCIETARIO = "SOCIETARIO";
    public static final String OUTROS = "OUTROS";

    private SetorResponsabilidade() {
    }

    public static String[] todos() {
        return new String[]{
                FISCAL, DEPARTAMENTO_PESSOAL, CONTABIL, FINANCEIRO,
                GERENTE_CONTA, SOCIETARIO, OUTROS
        };
    }

    public static String label(String setor) {
        if (setor == null) return "";
        return switch (setor) {
            case FISCAL -> "Fiscal";
            case DEPARTAMENTO_PESSOAL -> "Departamento Pessoal";
            case CONTABIL -> "Contábil";
            case FINANCEIRO -> "Financeiro";
            case GERENTE_CONTA -> "Gerente de Conta";
            case SOCIETARIO -> "Societário";
            case OUTROS -> "Outros";
            default -> setor;
        };
    }
}
