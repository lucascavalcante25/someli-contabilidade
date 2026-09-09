package br.com.someli.service;

import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.ClienteResponsavel;
import br.com.someli.domain.Notification;
import br.com.someli.domain.ObrigacaoOcorrencia;
import br.com.someli.domain.StatusObrigacaoOcorrencia;
import br.com.someli.domain.Usuario;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.NotificationRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaRepository;
import br.com.someli.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final ObrigacaoOcorrenciaRepository ocorrenciaRepository;
    private final ClienteResponsavelRepository clienteResponsavelRepository;
    private final AuthorizationService authorizationService;
    private final SecurityUtils securityUtils;

    public NotificationService(NotificationRepository notificationRepository,
                               ObrigacaoOcorrenciaRepository ocorrenciaRepository,
                               ClienteResponsavelRepository clienteResponsavelRepository,
                               AuthorizationService authorizationService,
                               SecurityUtils securityUtils) {
        this.notificationRepository = notificationRepository;
        this.ocorrenciaRepository = ocorrenciaRepository;
        this.clienteResponsavelRepository = clienteResponsavelRepository;
        this.authorizationService = authorizationService;
        this.securityUtils = securityUtils;
    }

    @Transactional(readOnly = true)
    public List<Notification> listarPorClienteObrigacao(Long clienteObrigacaoId) {
        return notificationRepository.findByClienteObrigacaoIdOrderByDataCriacaoDesc(clienteObrigacaoId);
    }

    @Transactional(readOnly = true)
    public List<Notification> listarNaoLidas() {
        Usuario u = securityUtils.requireCurrentUser();
        if (authorizationService.hasAlcadaGlobal(u)) {
            return notificationRepository.findByUsuarioIdAndLidaFalseOrderByDataCriacaoDesc(u.getId());
        }
        return notificationRepository.findByUsuarioIdAndLidaFalseOrderByDataCriacaoDesc(u.getId());
    }

    public long contarNaoLidas() {
        Usuario u = securityUtils.requireCurrentUser();
        return notificationRepository.countByUsuarioIdAndLidaFalse(u.getId());
    }

    public Notification marcarComoLida(Long id) {
        Usuario u = securityUtils.requireCurrentUser();
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notificação não encontrada"));
        if (n.getUsuario() != null && !n.getUsuario().getId().equals(u.getId())
                && !authorizationService.hasAlcadaGlobal(u)) {
            throw new br.com.someli.exception.AcessoNegadoException("Notificação de outro usuário");
        }
        n.setLida(true);
        return notificationRepository.save(n);
    }

    /** Compatibilidade legado — cria notificação global sem destinatário. Preferir criarParaUsuarios. */
    public Notification criar(ClienteObrigacao clienteObrigacao, String titulo, String descricao, String prioridade) {
        Notification n = new Notification();
        n.setClienteObrigacao(clienteObrigacao);
        n.setTitulo(titulo);
        n.setDescricao(descricao);
        n.setPrioridade(prioridade != null ? prioridade : "normal");
        n.setTipo("OBRIGACAO_ALERTA");
        return notificationRepository.save(n);
    }

    /**
     * Cria notificação para um usuário com chave de deduplicação.
     * Retorna null se já existir (não duplica).
     */
    @Transactional
    public Notification criarSeNaoExiste(Usuario destinatario,
                                         ObrigacaoOcorrencia ocorrencia,
                                         String titulo,
                                         String descricao,
                                         String prioridade,
                                         String tipo,
                                         String chaveDedup,
                                         String link) {
        if (destinatario == null || chaveDedup == null) return null;
        if (notificationRepository.existsByUsuarioIdAndChaveDedup(destinatario.getId(), chaveDedup)) {
            return null;
        }
        Notification n = new Notification();
        n.setUsuario(destinatario);
        n.setOcorrencia(ocorrencia);
        if (ocorrencia != null) {
            n.setClienteObrigacao(ocorrencia.getClienteObrigacao());
        }
        n.setTitulo(titulo);
        n.setDescricao(descricao);
        n.setPrioridade(prioridade != null ? prioridade : "normal");
        n.setTipo(tipo != null ? tipo : "OBRIGACAO_ALERTA");
        n.setChaveDedup(chaveDedup);
        n.setLink(link);
        try {
            return notificationRepository.save(n);
        } catch (Exception e) {
            log.debug("Notificação duplicada ignorada: {}", chaveDedup);
            return null;
        }
    }

    /**
     * Processa alertas de obrigações respeitando alçada por setor.
     */
    @Transactional
    public int processarAlertasOcorrencias() {
        LocalDate hoje = LocalDate.now();
        List<ObrigacaoOcorrencia> abertas = ocorrenciaRepository.findAbertasComVencimentoAte(hoje.plusDays(60));
        int criadas = 0;

        for (ObrigacaoOcorrencia oo : abertas) {
            ClienteObrigacao config = oo.getClienteObrigacao();
            int diasAntecedencia = config.resolverDiasAntecedencia();
            LocalDate dataAlerta = oo.getDataVencimento().minusDays(diasAntecedencia);
            if (hoje.isBefore(dataAlerta)) {
                continue;
            }

            boolean atrasada = hoje.isAfter(oo.getDataVencimento())
                    && !StatusObrigacaoOcorrencia.isFinal(oo.getStatus());
            if (atrasada && !StatusObrigacaoOcorrencia.ATRASADA.equals(oo.getStatus())
                    && !StatusObrigacaoOcorrencia.AGUARDANDO_CLIENTE.equals(oo.getStatus())) {
                oo.setStatus(StatusObrigacaoOcorrencia.ATRASADA);
                ocorrenciaRepository.save(oo);
            }

            String setor = config.resolverSetor();
            Long clienteId = config.getCliente().getId();
            Set<Usuario> destinatarios = new HashSet<>();

            if (config.getResponsavel() != null && Boolean.TRUE.equals(config.getResponsavel().getAtivo())) {
                destinatarios.add(config.getResponsavel());
            }

            List<ClienteResponsavel> responsaveis = clienteResponsavelRepository.findAtivosByClienteId(clienteId);
            for (ClienteResponsavel cr : responsaveis) {
                if (setor.equals(cr.getSetor()) || "GERENTE_CONTA".equals(cr.getSetor())) {
                    if (Boolean.TRUE.equals(cr.getUsuario().getAtivo())) {
                        destinatarios.add(cr.getUsuario());
                    }
                }
            }

            String prioridade = atrasada || hoje.isAfter(oo.getDataVencimento()) ? "critica" : "normal";
            String titulo = hoje.isAfter(oo.getDataVencimento())
                    ? "Obrigação ATRASADA: " + config.getObrigacao().getNome()
                    : "Obrigação vencendo: " + config.getObrigacao().getNome();
            long dias = java.time.temporal.ChronoUnit.DAYS.between(hoje, oo.getDataVencimento());
            String descricao = dias < 0
                    ? String.format("%s da Empresa %s está atrasada (venc. %s).",
                    config.getObrigacao().getNome(), config.getCliente().getRazaoSocial(), oo.getDataVencimento())
                    : String.format("%s da Empresa %s vence em %d dia(s) (%s).",
                    config.getObrigacao().getNome(), config.getCliente().getRazaoSocial(), dias, oo.getDataVencimento());

            String tipoAlerta = hoje.isAfter(oo.getDataVencimento()) ? "ATRASADA" : "VENCENDO";
            String link = "/clientes/" + clienteId;

            for (Usuario dest : destinatarios) {
                String chave = "OBRIGACAO:" + oo.getId() + ":" + dest.getId() + ":" + tipoAlerta;
                Notification n = criarSeNaoExiste(dest, oo, titulo, descricao, prioridade, "OBRIGACAO_ALERTA", chave, link);
                if (n != null) criadas++;
            }
        }
        return criadas;
    }
}
