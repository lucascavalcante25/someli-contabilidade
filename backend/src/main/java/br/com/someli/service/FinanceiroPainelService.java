package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.ClientePagamentoDTO;
import br.com.someli.dto.PainelFinanceiroDTO;
import br.com.someli.dto.ResumoFinanceiroDTO;
import br.com.someli.repository.ClienteRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class FinanceiroPainelService {

    private static final int DIAS_ALERTA_REAJUSTE = 60;

    private final FinanceiroService financeiroService;
    private final ClienteRepository clienteRepository;
    private final AuthorizationService authorizationService;

    public FinanceiroPainelService(FinanceiroService financeiroService,
                                   ClienteRepository clienteRepository,
                                   AuthorizationService authorizationService) {
        this.financeiroService = financeiroService;
        this.clienteRepository = clienteRepository;
        this.authorizationService = authorizationService;
    }

    public PainelFinanceiroDTO obter(int ano) {
        return obter(ano, LocalDate.now());
    }

    PainelFinanceiroDTO obter(int ano, LocalDate hoje) {
        authorizationService.requirePermission(PermissaoCodigo.FINANCEIRO_VISUALIZAR);

        int ultimoMes = ano == hoje.getYear() ? hoje.getMonthValue() : 12;
        List<PainelFinanceiroDTO.Mes> meses = new ArrayList<>();
        BigDecimal recebido = BigDecimal.ZERO;
        BigDecimal despesas = BigDecimal.ZERO;
        ResumoFinanceiroDTO ultimoResumo = null;

        for (int mes = 1; mes <= ultimoMes; mes++) {
            ResumoFinanceiroDTO resumo = financeiroService.obterResumo(mes, ano);
            BigDecimal resultado = resumo.getReceitaRecebida().subtract(resumo.getDespesasPagas());
            meses.add(new PainelFinanceiroDTO.Mes(
                    mes, resumo.getReceitaTotal(), resumo.getReceitaRecebida(), resumo.getDespesasPagas(), resultado));
            recebido = recebido.add(resumo.getReceitaRecebida());
            despesas = despesas.add(resumo.getDespesasPagas());
            ultimoResumo = resumo;
        }

        List<PainelFinanceiroDTO.Inadimplente> inadimplentes = inadimplentes(ultimoResumo);
        BigDecimal resultadoAno = recebido.subtract(despesas);
        BigDecimal margem = recebido.signum() == 0 ? BigDecimal.ZERO
                : resultadoAno.multiply(BigDecimal.valueOf(100)).divide(recebido, 1, RoundingMode.HALF_UP);

        return new PainelFinanceiroDTO(
                ano,
                recebido,
                despesas,
                resultadoAno,
                margem,
                inadimplentes.stream().map(PainelFinanceiroDTO.Inadimplente::valor)
                        .reduce(BigDecimal.ZERO, BigDecimal::add),
                meses,
                inadimplentes,
                reajustes(hoje));
    }

    private List<PainelFinanceiroDTO.Inadimplente> inadimplentes(ResumoFinanceiroDTO resumo) {
        if (resumo == null || resumo.getClientes() == null) {
            return List.of();
        }
        return resumo.getClientes().stream()
                .filter(c -> c.getValorPendente() != null && c.getValorPendente().signum() > 0)
                .sorted(Comparator.comparing(ClientePagamentoDTO::getValorPendente).reversed())
                .map(c -> new PainelFinanceiroDTO.Inadimplente(
                        c.getId(), c.getNomeFantasia(), c.getValorPendente(),
                        c.getMesesPendentes() == null ? 0 : c.getMesesPendentes()))
                .toList();
    }

    private List<PainelFinanceiroDTO.Reajuste> reajustes(LocalDate hoje) {
        List<PainelFinanceiroDTO.Reajuste> lista = new ArrayList<>();
        for (Cliente c : clienteRepository.findAll()) {
            LocalDate inicio = c.getDataInicioCobranca();
            if (!Boolean.TRUE.equals(c.getAtivo()) || inicio == null) {
                continue;
            }
            LocalDate proximo = inicio.withYear(hoje.getYear());
            if (proximo.isBefore(hoje)) {
                proximo = proximo.plusYears(1);
            }
            int anos = (int) ChronoUnit.YEARS.between(inicio, proximo);
            if (anos >= 1 && ChronoUnit.DAYS.between(hoje, proximo) <= DIAS_ALERTA_REAJUSTE) {
                lista.add(new PainelFinanceiroDTO.Reajuste(
                        c.getId(),
                        c.getNomeFantasia() != null ? c.getNomeFantasia() : c.getRazaoSocial(),
                        proximo, anos, c.getHonorario()));
            }
        }
        lista.sort(Comparator.comparing(PainelFinanceiroDTO.Reajuste::dataReajuste));
        return lista;
    }
}
