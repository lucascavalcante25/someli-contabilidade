package br.com.someli.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

/** Todo dia às 7h (Brasília): avisa no sino os aniversários e dias de profissão de hoje. */
@Component
public class DatasEspeciaisScheduler {

    private static final Logger log = LoggerFactory.getLogger(DatasEspeciaisScheduler.class);
    private static final ZoneId BRASILIA = ZoneId.of("America/Sao_Paulo");

    private final DatasEspeciaisService service;

    public DatasEspeciaisScheduler(DatasEspeciaisService service) {
        this.service = service;
    }

    @Scheduled(cron = "0 0 7 * * *", zone = "America/Sao_Paulo")
    public void avisarDatasDeHoje() {
        try {
            int criadas = service.notificarDia(LocalDate.now(BRASILIA));
            log.info("Datas especiais: {} aviso(s) criado(s).", criadas);
        } catch (Exception e) {
            log.error("Falha ao avisar datas especiais: {}", e.getMessage(), e);
        }
    }
}
