package br.com.someli.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class ObrigacaoAlertaScheduler {

    private static final Logger log = LoggerFactory.getLogger(ObrigacaoAlertaScheduler.class);

    private final NotificationService notificationService;
    private final ObrigacaoOcorrenciaService ocorrenciaService;

    public ObrigacaoAlertaScheduler(NotificationService notificationService,
                                    ObrigacaoOcorrenciaService ocorrenciaService) {
        this.notificationService = notificationService;
        this.ocorrenciaService = ocorrenciaService;
    }

    @Scheduled(cron = "0 0 6 * * *")
    public void gerarAlertasDiarios() {
        log.info("Iniciando job de obrigações/notificações");
        try {
            int ocorrencias = ocorrenciaService.garantirOcorrenciasAbertas();
            log.info("Ocorrências geradas/garantidas: {}", ocorrencias);
        } catch (Exception e) {
            log.warn("Falha ao garantir ocorrências: {}", e.getMessage());
        }
        try {
            int criadas = notificationService.processarAlertasOcorrencias();
            log.info("Job de alertas concluído. {} notificações criadas.", criadas);
        } catch (Exception e) {
            log.error("Falha no job de alertas: {}", e.getMessage(), e);
        }
    }
}
