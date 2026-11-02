package br.com.someli.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PainelFinanceiroDTO(
        int ano,
        BigDecimal recebidoNoAno,
        BigDecimal despesasNoAno,
        BigDecimal resultadoNoAno,
        BigDecimal margemPercentual,
        BigDecimal totalEmAberto,
        List<Mes> meses,
        List<Inadimplente> inadimplentes,
        List<Reajuste> reajustes
) {
    public record Mes(int mes, BigDecimal previsto, BigDecimal recebido, BigDecimal despesas, BigDecimal resultado) {
    }

    public record Inadimplente(Long clienteId, String nome, BigDecimal valor, int meses) {
    }

    public record Reajuste(Long clienteId, String nome, LocalDate dataReajuste, int anosDeContrato, BigDecimal honorario) {
    }
}
