package br.com.someli.service;

import br.com.someli.integration.BrasilApiClient;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Ajusta datas de vencimento para o próximo dia útil (pula sábado/domingo e feriados nacionais).
 */
@Service
public class DiaUtilService {

    private final BrasilApiClient brasilApiClient;
    private final Map<Integer, Set<LocalDate>> cacheFeriados = new ConcurrentHashMap<>();

    public DiaUtilService(BrasilApiClient brasilApiClient) {
        this.brasilApiClient = brasilApiClient;
    }

    public LocalDate proximoDiaUtil(LocalDate data) {
        if (data == null) return null;
        LocalDate d = data;
        int guard = 0;
        while (!isDiaUtil(d) && guard++ < 15) {
            d = d.plusDays(1);
        }
        return d;
    }

    public boolean isDiaUtil(LocalDate data) {
        if (data == null) return false;
        DayOfWeek dow = data.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) return false;
        return !feriadosDoAno(data.getYear()).contains(data);
    }

    public Set<LocalDate> feriadosDoAno(int ano) {
        return cacheFeriados.computeIfAbsent(ano, brasilApiClient::feriadosNacionais);
    }

    /** Permite limpar cache em testes. */
    void limparCache() {
        cacheFeriados.clear();
    }
}
