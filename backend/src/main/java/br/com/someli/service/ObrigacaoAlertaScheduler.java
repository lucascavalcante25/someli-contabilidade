package br.com.someli.service;

import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ObrigacaoAlertaScheduler {

    private static final Logger log = LoggerFactory.getLogger(ObrigacaoAlertaScheduler.class);

    private final ClienteObrigacaoRepository clienteObrigacaoRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    public ObrigacaoAlertaScheduler(ClienteObrigacaoRepository clienteObrigacaoRepository,
                                    NotificationService notificationService,
                                    NotificationRepository notificationRepository) {
        this.clienteObrigacaoRepository = clienteObrigacaoRepository;
        this.notificationService = notificationService;
        this.notificationRepository = notificationRepository;
    }

    @Scheduled(cron = "0 0 6 * * *")
    public void gerarAlertasDiarios() {
        LocalDate hoje = LocalDate.now();
        log.info("Iniciando job de alertas de obrigações para {}", hoje);

        List<ClienteObrigacao> ativas = clienteObrigacaoRepository.findAtivasComVencimentoAte(hoje.plusDays(365));

        int criadas = 0;
        for (ClienteObrigacao co : ativas) {
            int diasAntecedencia = co.getObrigacao().getDiasAntecedenciaAlerta() != null
                    ? co.getObrigacao().getDiasAntecedenciaAlerta()
                    : 7;

            LocalDate dataAlerta = co.getDataVencimento().minusDays(diasAntecedencia);

            if (hoje.isBefore(dataAlerta)) {
                continue;
            }

            LocalDateTime inicioDia = hoje.atStartOfDay();
            LocalDateTime fimDia = hoje.plusDays(1).atStartOfDay();
            if (notificationRepository.existsByClienteObrigacaoIdAndDataCriacaoBetween(co.getId(), inicioDia, fimDia)) {
                continue;
            }

            String prioridade = hoje.isAfter(co.getDataVencimento()) ? "critica" : "normal";
            String titulo = hoje.isAfter(co.getDataVencimento())
                    ? "Obrigação ATRASADA: " + co.getObrigacao().getNome()
                    : "Obrigação vencendo: " + co.getObrigacao().getNome();
            String descricao = String.format("Cliente: %s | Vencimento: %s | %s",
                    co.getCliente().getRazaoSocial(),
                    co.getDataVencimento(),
                    co.getObservacao() != null ? co.getObservacao() : "");

            try {
                notificationService.criar(co, titulo, descricao.trim(), prioridade);
                criadas++;
            } catch (Exception e) {
                log.warn("Erro ao criar notificação para ClienteObrigacao {}: {}", co.getId(), e.getMessage());
            }
        }

        log.info("Job de alertas concluído. {} notificações criadas.", criadas);
    }
}
