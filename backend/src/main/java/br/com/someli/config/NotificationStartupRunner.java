package br.com.someli.config;

import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.NotificationRepository;
import br.com.someli.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Sincroniza notificações na inicialização da aplicação, garantindo que obrigações
 * dentro do período de alerta tenham notificações criadas (útil quando o job das 6h
 * ainda não rodou ou para ambientes de desenvolvimento).
 */
@Component
@Order(1)
public class NotificationStartupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(NotificationStartupRunner.class);

    private final ClienteObrigacaoRepository clienteObrigacaoRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    public NotificationStartupRunner(ClienteObrigacaoRepository clienteObrigacaoRepository,
                                     NotificationService notificationService,
                                     NotificationRepository notificationRepository) {
        this.clienteObrigacaoRepository = clienteObrigacaoRepository;
        this.notificationService = notificationService;
        this.notificationRepository = notificationRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            LocalDate hoje = LocalDate.now();
            List<ClienteObrigacao> ativas = clienteObrigacaoRepository.findAtivasComVencimentoAte(hoje.plusDays(365));

            int criadas = 0;
            for (ClienteObrigacao co : ativas) {
                int diasAntecedencia = co.getObrigacao().getDiasAntecedenciaAlerta() != null
                        ? co.getObrigacao().getDiasAntecedenciaAlerta()
                        : 7;

                LocalDate dataAlerta = co.getDataVencimento().minusDays(diasAntecedencia);
                if (hoje.isBefore(dataAlerta)) continue;

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
                    log.warn("Erro ao criar notificação na inicialização para ClienteObrigacao {}: {}", co.getId(), e.getMessage());
                }
            }

            if (criadas > 0) {
                log.info("Sincronização de notificações na inicialização: {} criada(s).", criadas);
            }
        } catch (Exception e) {
            log.warn("Erro ao sincronizar notificações na inicialização: {}", e.getMessage());
        }
    }
}
