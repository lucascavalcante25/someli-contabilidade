package br.com.someli.service;

import br.com.someli.domain.Despesa;
import br.com.someli.domain.DespesaMensal;
import br.com.someli.repository.DespesaMensalRepository;
import br.com.someli.repository.DespesaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class DespesaMensalService {

    private final DespesaMensalRepository despesaMensalRepository;
    private final DespesaRepository despesaRepository;

    public DespesaMensalService(DespesaMensalRepository despesaMensalRepository,
                               DespesaRepository despesaRepository) {
        this.despesaMensalRepository = despesaMensalRepository;
        this.despesaRepository = despesaRepository;
    }

    @Transactional
    public void marcarPaga(Long despesaId, int mes, int ano) {
        Despesa despesa = despesaRepository.findById(despesaId)
                .orElseThrow(() -> new IllegalArgumentException("Despesa não encontrada"));
        DespesaMensal dm = despesaMensalRepository.findByDespesaIdAndMesAndAno(despesaId, mes, ano)
                .orElseGet(() -> { 
                    DespesaMensal novo = new DespesaMensal();
                    novo.setDespesaId(despesaId);
                    novo.setMes(mes);
                    novo.setAno(ano);
                    return novo;
                });
        boolean jaEstavaPaga = Boolean.TRUE.equals(dm.getPaga());
        dm.setPaga(true);
        despesaMensalRepository.save(dm);

        if (!jaEstavaPaga && isParceladaOuCartao(despesa)) {
            int parcelaAtual = despesa.getParcelaAtual() != null ? despesa.getParcelaAtual() : 1;
            int parcelas = despesa.getParcelas() != null ? despesa.getParcelas() : 1;
            if (parcelaAtual >= parcelas) {
                despesa.setAtivo(false);
                despesaRepository.save(despesa);
            } else {
                despesa.setParcelaAtual(parcelaAtual + 1);
                despesaRepository.save(despesa);
            }
        }
    }

    @Transactional
    public void desmarcarPaga(Long despesaId, int mes, int ano) {
        Despesa despesa = despesaRepository.findById(despesaId).orElse(null);
        Optional<DespesaMensal> opt = despesaMensalRepository.findByDespesaIdAndMesAndAno(despesaId, mes, ano);
        opt.ifPresent(dm -> {
            boolean estavaPaga = Boolean.TRUE.equals(dm.getPaga());
            dm.setPaga(false);
            despesaMensalRepository.save(dm);
            if (estavaPaga && despesa != null && isParceladaOuCartao(despesa) && despesa.getParcelaAtual() != null && despesa.getParcelaAtual() > 1) {
                despesa.setParcelaAtual(despesa.getParcelaAtual() - 1);
                if (Boolean.FALSE.equals(despesa.getAtivo())) despesa.setAtivo(true);
                despesaRepository.save(despesa);
            }
        });
    }

    public boolean isPaga(Long despesaId, int mes, int ano) {
        return despesaMensalRepository.findByDespesaIdAndMesAndAno(despesaId, mes, ano)
                .map(DespesaMensal::getPaga)
                .orElse(false);
    }

    private boolean isParceladaOuCartao(Despesa d) {
        String t = d.getTipo() != null ? d.getTipo().toLowerCase() : "";
        return "parcelada".equals(t) || "cartao".equals(t) || "cartão".equals(t);
    }
}
