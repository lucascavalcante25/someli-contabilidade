package br.com.someli.integration;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Feriados nacionais calculados localmente: usados quando a BrasilAPI não responde,
 * para o ajuste de vencimentos nunca ficar sem feriado.
 */
public final class FeriadosNacionaisFixos {

    private FeriadosNacionaisFixos() {
    }

    public static List<BrasilApiClient.FeriadoDto> doAno(int ano) {
        List<BrasilApiClient.FeriadoDto> lista = new ArrayList<>();
        add(lista, LocalDate.of(ano, 1, 1), "Confraternização mundial");
        add(lista, pascoa(ano).minusDays(2), "Sexta-feira Santa");
        add(lista, LocalDate.of(ano, 4, 21), "Tiradentes");
        add(lista, LocalDate.of(ano, 5, 1), "Dia do trabalho");
        add(lista, LocalDate.of(ano, 9, 7), "Independência do Brasil");
        add(lista, LocalDate.of(ano, 10, 12), "Nossa Senhora Aparecida");
        add(lista, LocalDate.of(ano, 11, 2), "Finados");
        add(lista, LocalDate.of(ano, 11, 15), "Proclamação da República");
        if (ano >= 2024) {
            add(lista, LocalDate.of(ano, 11, 20), "Dia da Consciência Negra"); // Lei 14.759/2023
        }
        add(lista, LocalDate.of(ano, 12, 25), "Natal");
        lista.sort(Comparator.comparing(f -> f.date));
        return lista;
    }

    /** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
    static LocalDate pascoa(int ano) {
        int a = ano % 19, b = ano / 100, c = ano % 100, d = b / 4, e = b % 4;
        int f = (b + 8) / 25, g = (b - f + 1) / 3, h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4, k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;
        int mes = (h + l - 7 * m + 114) / 31, dia = ((h + l - 7 * m + 114) % 31) + 1;
        return LocalDate.of(ano, mes, dia);
    }

    private static void add(List<BrasilApiClient.FeriadoDto> lista, LocalDate data, String nome) {
        BrasilApiClient.FeriadoDto f = new BrasilApiClient.FeriadoDto();
        f.date = data.toString();
        f.name = nome;
        f.type = "national";
        lista.add(f);
    }
}
