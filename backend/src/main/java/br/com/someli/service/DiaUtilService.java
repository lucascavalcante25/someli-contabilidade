package br.com.someli.service;

import br.com.someli.domain.SetorResponsabilidade;
import br.com.someli.integration.BrasilApiClient;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

/**
 * Ajusta vencimentos que caem em sábado, domingo ou feriado nacional.
 * Regra do escritório: obrigações do Departamento Pessoal antecipam para o dia útil anterior;
 * as demais (Fiscal, Contábil, Societário...) prorrogam para o próximo dia útil.
 */
@Service
public class DiaUtilService {

    private static final int LIMITE_DIAS = 15;

    private final BrasilApiClient brasilApiClient;

    public DiaUtilService(BrasilApiClient brasilApiClient) {
        this.brasilApiClient = brasilApiClient;
    }

    /** Data já ajustada para dia útil conforme o setor da obrigação. */
    public LocalDate ajustarVencimento(LocalDate data, String setor) {
        return antecipa(setor) ? diaUtilAnterior(data) : proximoDiaUtil(data);
    }

    public static boolean antecipa(String setor) {
        return SetorResponsabilidade.DEPARTAMENTO_PESSOAL.equals(setor);
    }

    public LocalDate proximoDiaUtil(LocalDate data) {
        return andarAteDiaUtil(data, 1);
    }

    public LocalDate diaUtilAnterior(LocalDate data) {
        return andarAteDiaUtil(data, -1);
    }

    private LocalDate andarAteDiaUtil(LocalDate data, int passo) {
        if (data == null) return null;
        LocalDate d = data;
        int guard = 0;
        while (!isDiaUtil(d) && guard++ < LIMITE_DIAS) {
            d = d.plusDays(passo);
        }
        return d;
    }

    public boolean isDiaUtil(LocalDate data) {
        if (data == null) return false;
        DayOfWeek dow = data.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) return false;
        return !feriadosDoAno(data.getYear()).contains(data);
    }

    /** O cache fica no BrasilApiClient, que não guarda a lista local de quando a API falha. */
    public Set<LocalDate> feriadosDoAno(int ano) {
        return brasilApiClient.feriadosNacionais(ano);
    }
}
