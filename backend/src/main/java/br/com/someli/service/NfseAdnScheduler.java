package br.com.someli.service;

import br.com.someli.repository.NfseSyncEstadoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

/**
 * De hora em hora, busca as NFS-e dos clientes com a busca ligada e consulta vencida.
 * Desligado por padrão: NFSE_ADN_AGENDAMENTO=true liga em produção.
 */
@Component
public class NfseAdnScheduler {

    private static final Logger log = LoggerFactory.getLogger(NfseAdnScheduler.class);

    private final NfseSyncEstadoRepository estadoRepository;
    private final NfseAdnSyncService syncService;
    private final Clock clock;
    private final boolean ligado;

    public NfseAdnScheduler(NfseSyncEstadoRepository estadoRepository,
                            NfseAdnSyncService syncService,
                            Clock clock,
                            @Value("${nfse.adn.agendamento-ativo:false}") boolean ligado) {
        this.estadoRepository = estadoRepository;
        this.syncService = syncService;
        this.clock = clock;
        this.ligado = ligado;
    }

    @Scheduled(cron = "${nfse.adn.cron:0 17 * * * *}")
    public void executar() {
        if (!ligado) return;
        List<Long> clientes = estadoRepository.findClienteIdsParaConsultar(LocalDateTime.now(clock));
        int novas = 0;
        for (Long clienteId : clientes) {
            try {
                novas += syncService.sincronizar(clienteId).novas();
            } catch (Exception e) {
                log.warn("Job NFS-e ADN: cliente {} falhou ({})", clienteId, e.getClass().getSimpleName());
            }
        }
        if (!clientes.isEmpty()) {
            log.info("Job NFS-e ADN: {} cliente(s) consultado(s), {} nota(s) nova(s)", clientes.size(), novas);
        }
    }
}
