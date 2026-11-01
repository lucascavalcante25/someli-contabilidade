package br.com.someli.service;

import br.com.someli.domain.PagamentoMensal;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.PagamentoMensalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class PagamentoMensalService {

    private final PagamentoMensalRepository pagamentoMensalRepository;
    private final ClienteRepository clienteRepository;
    private final TagSyncService tagSyncService;

    public PagamentoMensalService(PagamentoMensalRepository pagamentoMensalRepository,
                                  ClienteRepository clienteRepository,
                                  TagSyncService tagSyncService) {
        this.pagamentoMensalRepository = pagamentoMensalRepository;
        this.clienteRepository = clienteRepository;
        this.tagSyncService = tagSyncService;
    }

    @Transactional
    public void marcarPago(Long clienteId, int mes, int ano) {
        if (!clienteRepository.existsById(clienteId)) {
            throw new IllegalArgumentException("Cliente não encontrado");
        }
        PagamentoMensal pm = pagamentoMensalRepository.findByClienteIdAndMesAndAno(clienteId, mes, ano)
                .orElseGet(() -> {
                    PagamentoMensal novo = new PagamentoMensal();
                    novo.setClienteId(clienteId);
                    novo.setMes(mes);
                    novo.setAno(ano);
                    return novo;
                });
        pm.setPago(true);
        pagamentoMensalRepository.save(pm);
        tagSyncService.sincronizarCliente(clienteId);
    }

    @Transactional
    public void desmarcarPago(Long clienteId, int mes, int ano) {
        Optional<PagamentoMensal> opt = pagamentoMensalRepository.findByClienteIdAndMesAndAno(clienteId, mes, ano);
        opt.ifPresent(pm -> {
            pm.setPago(false);
            pagamentoMensalRepository.save(pm);
        });
        tagSyncService.sincronizarCliente(clienteId);
    }

    public boolean isPago(Long clienteId, int mes, int ano) {
        return pagamentoMensalRepository.findByClienteIdAndMesAndAno(clienteId, mes, ano)
                .map(PagamentoMensal::getPago)
                .orElse(false);
    }
}
