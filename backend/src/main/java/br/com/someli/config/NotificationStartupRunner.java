package br.com.someli.config;

import br.com.someli.service.NotificationService;
import br.com.someli.service.ObrigacaoOcorrenciaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Sincroniza ocorrências e notificações na inicialização.
 */
@Component
@Order(1)
public class NotificationStartupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(NotificationStartupRunner.class);

    private final NotificationService notificationService;
    private final ObrigacaoOcorrenciaService ocorrenciaService;

    public NotificationStartupRunner(NotificationService notificationService,
                                     ObrigacaoOcorrenciaService ocorrenciaService) {
        this.notificationService = notificationService;
        this.ocorrenciaService = ocorrenciaService;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            int ocorrencias = ocorrenciaService.garantirOcorrenciasAbertas();
            int criadas = notificationService.processarAlertasOcorrencias();
            if (ocorrencias > 0 || criadas > 0) {
                log.info("Startup sync: {} ocorrência(s), {} notificação(ões).", ocorrencias, criadas);
            }
        } catch (Exception e) {
            log.warn("Erro ao sincronizar obrigações/notificações na inicialização: {}", e.getMessage());
        }
    }
}
