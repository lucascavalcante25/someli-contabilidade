package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.Despesa;
import br.com.someli.domain.DespesaMensal;
import br.com.someli.domain.PagamentoMensal;
import br.com.someli.dto.ClientePagamentoDTO;
import br.com.someli.dto.DespesaMensalDTO;
import br.com.someli.dto.GraficoMensalDTO;
import br.com.someli.dto.ResumoFinanceiroDTO;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.DespesaMensalRepository;
import br.com.someli.repository.DespesaRepository;
import br.com.someli.repository.PagamentoMensalRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FinanceiroService {

    private final ClienteRepository clienteRepository;
    private final PagamentoMensalRepository pagamentoMensalRepository;
    private final DespesaRepository despesaRepository;
    private final DespesaMensalRepository despesaMensalRepository;

    public FinanceiroService(ClienteRepository clienteRepository,
                             PagamentoMensalRepository pagamentoMensalRepository,
                             DespesaRepository despesaRepository,
                             DespesaMensalRepository despesaMensalRepository) {
        this.clienteRepository = clienteRepository;
        this.pagamentoMensalRepository = pagamentoMensalRepository;
        this.despesaRepository = despesaRepository;
        this.despesaMensalRepository = despesaMensalRepository;
    }

    public ResumoFinanceiroDTO obterResumo(int mes, int ano) {
        List<Cliente> clientes = clienteRepository.findAll();
        List<PagamentoMensal> pagamentos = pagamentoMensalRepository.findByMesAndAno(mes, ano);
        List<Despesa> todasDespesas = despesaRepository.findAll().stream()
                .sorted((a, b) -> (a.getDescricao() != null ? a.getDescricao() : "").compareToIgnoreCase(b.getDescricao() != null ? b.getDescricao() : ""))
                .collect(Collectors.toList());
        List<DespesaMensal> despesasMensais = despesaMensalRepository.findByMesAndAno(mes, ano);

        BigDecimal receitaTotal = clientes.stream()
                .map(c -> c.getHonorario() != null ? c.getHonorario() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ClientePagamentoDTO> clientesDto = clientes.stream().map(c -> {
            boolean pago = pagamentos.stream()
                    .anyMatch(p -> p.getClienteId().equals(c.getId()) && Boolean.TRUE.equals(p.getPago()));
            ClientePagamentoDTO dto = new ClientePagamentoDTO();
            dto.setId(c.getId());
            dto.setNomeFantasia(c.getNomeFantasia() != null ? c.getNomeFantasia() : c.getRazaoSocial());
            dto.setHonorario(c.getHonorario() != null ? c.getHonorario() : BigDecimal.ZERO);
            dto.setDiaVencimento(c.getDiaVencimento());
            dto.setPago(pago);
            return dto;
        }).collect(Collectors.toList());

        BigDecimal receitaRecebida = clientesDto.stream()
                .filter(ClientePagamentoDTO::isPago)
                .map(ClientePagamentoDTO::getHonorario)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal receitaPendente = receitaTotal.subtract(receitaRecebida);

        List<Despesa> despesasDoMes = filtrarDespesasDoMes(todasDespesas, mes, ano);
        BigDecimal despesaTotal = despesasDoMes.stream()
                .map(d -> d.getValorMensal() != null ? d.getValorMensal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<DespesaMensalDTO> despesasDto = despesasDoMes.stream().map(d -> {
            boolean paga = despesasMensais.stream()
                    .anyMatch(dm -> dm.getDespesaId().equals(d.getId()) && Boolean.TRUE.equals(dm.getPaga()));
            DespesaMensalDTO dto = new DespesaMensalDTO();
            dto.setId(d.getId());
            dto.setDescricao(d.getDescricao());
            dto.setValorMensal(d.getValorMensal() != null ? d.getValorMensal() : BigDecimal.ZERO);
            dto.setDiaPagamento(d.getDiaPagamento());
            dto.setPaga(paga);
            dto.setParcelas(d.getParcelas());
            int parcelaDoMes = 1;
            if (d.getParcelas() != null && d.getParcelas() > 0) {
                YearMonth inicio = resolveInicioMes(d, YearMonth.of(ano, mes));
                YearMonth viewing = YearMonth.of(ano, mes);
                parcelaDoMes = (int) java.time.temporal.ChronoUnit.MONTHS.between(inicio, viewing) + 1;
                parcelaDoMes = Math.min(parcelaDoMes, d.getParcelas());
            }
            dto.setParcelaDoMes(parcelaDoMes);
            return dto;
        }).collect(Collectors.toList());

        BigDecimal despesasPagas = despesasDto.stream()
                .filter(DespesaMensalDTO::isPaga)
                .map(DespesaMensalDTO::getValorMensal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal despesasPendentes = despesaTotal.subtract(despesasPagas);
        BigDecimal saldo = receitaRecebida.subtract(despesasPagas);

        ResumoFinanceiroDTO resumo = new ResumoFinanceiroDTO();
        resumo.setReceitaTotal(receitaTotal);
        resumo.setReceitaRecebida(receitaRecebida);
        resumo.setReceitaPendente(receitaPendente);
        resumo.setDespesaTotal(despesaTotal);
        resumo.setDespesasPagas(despesasPagas);
        resumo.setDespesasPendentes(despesasPendentes);
        resumo.setSaldo(saldo);
        resumo.setMes(mes);
        resumo.setAno(ano);
        resumo.setClientes(clientesDto);
        resumo.setDespesas(despesasDto);
        return resumo;
    }

    /**
     * Inclui despesas que devem aparecer no mês:
     * - Parcelada/Cartão: sempre inclui nos meses do período (ex: 2 parcelas = mês 1 e 2), mesmo após finalizada (ativo=false)
     * - Fixa/Recorrente: inclui apenas se ativo=true
     */
    private List<Despesa> filtrarDespesasDoMes(List<Despesa> todas, int mes, int ano) {
        YearMonth ym = YearMonth.of(ano, mes);
        return todas.stream().filter(d -> {
            YearMonth inicio = resolveInicioMes(d, ym);
            if (ym.isBefore(inicio)) return false;
            if (d.getParcelas() != null && d.getParcelas() > 0) {
                int mesesDesdeInicio = (int) java.time.temporal.ChronoUnit.MONTHS.between(inicio, ym) + 1;
                return mesesDesdeInicio <= d.getParcelas();
            }
            return Boolean.TRUE.equals(d.getAtivo());
        }).collect(Collectors.toList());
    }

    private YearMonth resolveInicioMes(Despesa despesa, YearMonth fallback) {
        if (despesa == null || despesa.getDataInicio() == null) {
            return fallback;
        }
        return YearMonth.from(despesa.getDataInicio());
    }

    public List<GraficoMensalDTO> obterDadosGrafico(int ano) {
        String[] nomes = {"Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"};
        List<GraficoMensalDTO> resultado = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            ResumoFinanceiroDTO resumo = obterResumo(m, ano);
            BigDecimal rec = resumo.getReceitaRecebida() != null ? resumo.getReceitaRecebida() : BigDecimal.ZERO;
            BigDecimal desp = resumo.getDespesasPagas() != null ? resumo.getDespesasPagas() : BigDecimal.ZERO;
            resultado.add(new GraficoMensalDTO(nomes[m - 1], rec, desp));
        }
        return resultado;
    }
}
