package br.com.someli.service;

import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.ObrigacaoOcorrencia;
import br.com.someli.domain.ObrigacaoOcorrenciaEvento;
import br.com.someli.domain.PeriodicidadeObrigacao;
import br.com.someli.domain.StatusObrigacaoOcorrencia;
import br.com.someli.domain.Usuario;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaEventoRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Service
public class ObrigacaoOcorrenciaService {

    private final ObrigacaoOcorrenciaRepository ocorrenciaRepository;
    private final ObrigacaoOcorrenciaEventoRepository eventoRepository;
    private final ClienteObrigacaoRepository clienteObrigacaoRepository;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;
    private final DiaUtilService diaUtilService;

    public ObrigacaoOcorrenciaService(ObrigacaoOcorrenciaRepository ocorrenciaRepository,
                                      ObrigacaoOcorrenciaEventoRepository eventoRepository,
                                      ClienteObrigacaoRepository clienteObrigacaoRepository,
                                      AuthorizationService authorizationService,
                                      AuditLogService auditLogService,
                                      DiaUtilService diaUtilService) {
        this.ocorrenciaRepository = ocorrenciaRepository;
        this.eventoRepository = eventoRepository;
        this.clienteObrigacaoRepository = clienteObrigacaoRepository;
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
        this.diaUtilService = diaUtilService;
    }

    @Transactional(readOnly = true)
    public List<ObrigacaoOcorrencia> listarPorCliente(Long clienteId) {
        authorizationService.requireCompanyAccess(clienteId);
        authorizationService.requirePermission(br.com.someli.domain.PermissaoCodigo.OBRIGACOES_VISUALIZAR);
        List<ObrigacaoOcorrencia> todas = ocorrenciaRepository.findByClienteId(clienteId);
        Usuario u = authorizationService.currentUser();
        if (authorizationService.hasAlcadaGlobal(u)) return todas;
        return todas.stream()
                .filter(oo -> authorizationService.canAccessDepartment(
                        u, clienteId, oo.getClienteObrigacao().resolverSetor()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ObrigacaoOcorrencia buscar(Long id) {
        ObrigacaoOcorrencia oo = ocorrenciaRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new RegraNegocioException("Ocorrência não encontrada"));
        Long clienteId = oo.getClienteObrigacao().getCliente().getId();
        authorizationService.requireDepartmentAccess(clienteId, oo.getClienteObrigacao().resolverSetor());
        return oo;
    }

    @Transactional
    public ObrigacaoOcorrencia criarParaConfig(ClienteObrigacao config, LocalDate vencimento, String competencia) {
        if (competencia != null && ocorrenciaRepository.existsByClienteObrigacaoIdAndCompetencia(config.getId(), competencia)) {
            throw new RegraNegocioException("Já existe ocorrência para a competência " + competencia);
        }
        ObrigacaoOcorrencia oo = new ObrigacaoOcorrencia();
        oo.setClienteObrigacao(config);
        oo.setDataVencimento(vencimento);
        oo.setCompetencia(competencia);
        oo.setStatus(StatusObrigacaoOcorrencia.PENDENTE);
        oo.setObservacao(config.getObservacao());
        oo = ocorrenciaRepository.save(oo);
        registrarEvento(oo, null, "CRIADA", null, StatusObrigacaoOcorrencia.PENDENTE, "Ocorrência criada");
        return oo;
    }

    @Transactional
    public ObrigacaoOcorrencia atualizarStatus(Long id, String novoStatus) {
        authorizationService.requirePermission(
                StatusObrigacaoOcorrencia.isFinal(novoStatus)
                        ? br.com.someli.domain.PermissaoCodigo.OBRIGACOES_CONCLUIR
                        : br.com.someli.domain.PermissaoCodigo.OBRIGACOES_EDITAR);

        ObrigacaoOcorrencia oo = buscar(id);
        String anterior = oo.getStatus();

        if (StatusObrigacaoOcorrencia.isFinal(anterior)
                && !StatusObrigacaoOcorrencia.isFinal(novoStatus)) {
            authorizationService.requirePermission(br.com.someli.domain.PermissaoCodigo.OBRIGACOES_REABRIR);
        }

        oo.setStatus(novoStatus);
        if (StatusObrigacaoOcorrencia.CONCLUIDA.equals(novoStatus)
                || StatusObrigacaoOcorrencia.ENTREGUE.equals(novoStatus)) {
            oo.setConcluidaEm(LocalDateTime.now());
            oo.setConcluidaPor(authorizationService.currentUser());
        } else {
            oo.setConcluidaEm(null);
            oo.setConcluidaPor(null);
        }
        oo = ocorrenciaRepository.save(oo);
        registrarEvento(oo, authorizationService.currentUser(), "STATUS", anterior, novoStatus,
                "Status alterado de " + anterior + " para " + novoStatus);
        auditLogService.registrar("OBRIGACAO_STATUS", "OBRIGACAO_OCORRENCIA", String.valueOf(id), anterior, novoStatus);

        if (StatusObrigacaoOcorrencia.CONCLUIDA.equals(novoStatus)
                || StatusObrigacaoOcorrencia.ENTREGUE.equals(novoStatus)) {
            gerarProximaSeRecorrente(oo.getClienteObrigacao());
        }
        return oo;
    }

    /**
     * Gera a próxima ocorrência se a configuração for recorrente e ainda não existir.
     */
    @Transactional
    public void gerarProximaSeRecorrente(ClienteObrigacao config) {
        if (config == null || !Boolean.TRUE.equals(config.getAtivo())) return;
        String period = config.getPeriodicidade();
        if (period == null || PeriodicidadeObrigacao.UNICA.equals(period)) return;

        List<ObrigacaoOcorrencia> existentes = ocorrenciaRepository
                .findByClienteObrigacaoIdOrderByDataVencimentoDesc(config.getId());
        if (existentes.isEmpty()) return;

        ObrigacaoOcorrencia ultima = existentes.get(0);
        LocalDate proximoVenc = diaUtilService.proximoDiaUtil(
                avancarVencimento(ultima.getDataVencimento(), period, config.getDiaVencimento()));
        String proxCompetencia = competenciaDe(proximoVenc, period);

        if (proxCompetencia != null
                && ocorrenciaRepository.existsByClienteObrigacaoIdAndCompetencia(config.getId(), proxCompetencia)) {
            return;
        }

        // Evita gerar longe demais no futuro: no máximo 1 período à frente do mês corrente
        YearMonth limite = YearMonth.now().plusMonths(mesesDaPeriodicidade(period));
        if (YearMonth.from(proximoVenc).isAfter(limite)) {
            return;
        }

        criarParaConfig(config, proximoVenc, proxCompetencia);
        config.setDataVencimento(proximoVenc);
        clienteObrigacaoRepository.save(config);
    }

    /**
     * Garante ocorrência do período atual para configs recorrentes ativas.
     */
    @Transactional
    public int garantirOcorrenciasAbertas() {
        List<ClienteObrigacao> ativas = clienteObrigacaoRepository.findAll().stream()
                .filter(c -> Boolean.TRUE.equals(c.getAtivo()))
                .filter(c -> c.getPeriodicidade() != null && !PeriodicidadeObrigacao.UNICA.equals(c.getPeriodicidade()))
                .toList();
        int criadas = 0;
        YearMonth atual = YearMonth.now();
        for (ClienteObrigacao config : ativas) {
            String competencia = String.format("%04d-%02d", atual.getYear(), atual.getMonthValue());
            if (!ocorrenciaRepository.existsByClienteObrigacaoIdAndCompetencia(config.getId(), competencia)) {
                int dia = config.getDiaVencimento() != null ? config.getDiaVencimento()
                        : (config.getDataVencimento() != null ? config.getDataVencimento().getDayOfMonth() : 20);
                LocalDate venc = diaUtilService.proximoDiaUtil(resolverDataVencimento(atual, dia));
                criarParaConfig(config, venc, competencia);
                criadas++;
            }
        }
        return criadas;
    }

    public static LocalDate avancarVencimento(LocalDate atual, String periodicidade, Integer diaFixo) {
        YearMonth ym = YearMonth.from(atual);
        ym = switch (periodicidade) {
            case PeriodicidadeObrigacao.MENSAL -> ym.plusMonths(1);
            case PeriodicidadeObrigacao.TRIMESTRAL -> ym.plusMonths(3);
            case PeriodicidadeObrigacao.SEMESTRAL -> ym.plusMonths(6);
            case PeriodicidadeObrigacao.ANUAL -> ym.plusYears(1);
            default -> ym;
        };
        int dia = diaFixo != null ? diaFixo : atual.getDayOfMonth();
        return resolverDataVencimento(ym, dia);
    }

    public static LocalDate resolverDataVencimento(YearMonth ym, int dia) {
        int max = ym.lengthOfMonth();
        return ym.atDay(Math.min(Math.max(dia, 1), max));
    }

    public static String competenciaDe(LocalDate vencimento, String periodicidade) {
        if (vencimento == null) return null;
        // Competência típica: mês anterior ao vencimento para obrigações mensais
        YearMonth comp = PeriodicidadeObrigacao.MENSAL.equals(periodicidade)
                ? YearMonth.from(vencimento).minusMonths(1)
                : YearMonth.from(vencimento);
        return String.format("%04d-%02d", comp.getYear(), comp.getMonthValue());
    }

    private int mesesDaPeriodicidade(String p) {
        return switch (p) {
            case PeriodicidadeObrigacao.TRIMESTRAL -> 3;
            case PeriodicidadeObrigacao.SEMESTRAL -> 6;
            case PeriodicidadeObrigacao.ANUAL -> 12;
            default -> 1;
        };
    }

    private void registrarEvento(ObrigacaoOcorrencia oo, Usuario usuario, String tipo,
                                 String statusAnterior, String statusNovo, String mensagem) {
        ObrigacaoOcorrenciaEvento ev = new ObrigacaoOcorrenciaEvento();
        ev.setOcorrencia(oo);
        ev.setUsuario(usuario);
        ev.setTipoEvento(tipo);
        ev.setStatusAnterior(statusAnterior);
        ev.setStatusNovo(statusNovo);
        ev.setMensagem(mensagem);
        eventoRepository.save(ev);
    }

    @Transactional(readOnly = true)
    public List<ObrigacaoOcorrenciaEvento> historico(Long ocorrenciaId) {
        buscar(ocorrenciaId);
        return eventoRepository.findByOcorrenciaIdOrderByCreatedAtAsc(ocorrenciaId);
    }
}
