package br.com.someli.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TagSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(TagSyncScheduler.class);

    private final TagSyncService tagSyncService;

    public TagSyncScheduler(TagSyncService tagSyncService) {
        this.tagSyncService = tagSyncService;
    }

    /** Toda madrugada (após alertas de obrigação). */
    @Scheduled(cron = "0 15 6 * * *")
    public void sincronizarDiario() {
        try {
            int n = tagSyncService.sincronizarTodos();
            log.info("Job tags inteligentes: {} clientes atualizados", n);
        } catch (Exception e) {
            log.warn("Falha no job de tags inteligentes: {}", e.getMessage());
        }
    }

    /** Corrige tags "grudadas" assim que o backend sobe. */
    @EventListener(ApplicationReadyEvent.class)
    public void aoSubir() {
        try {
            int n = tagSyncService.sincronizarTodos();
            log.info("Startup tags inteligentes: {} clientes atualizados", n);
        } catch (Exception e) {
            log.warn("Startup tags inteligentes falhou (banco pode ainda migrar): {}", e.getMessage());
        }
    }
}
