package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.PagamentoMensal;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.CreateClienteRequestDTO;
import br.com.someli.dto.UpdateClienteRequestDTO;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.PagamentoMensalRepository;
import br.com.someli.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final PagamentoMensalRepository pagamentoMensalRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;

    public ClienteService(ClienteRepository clienteRepository,
                         PagamentoMensalRepository pagamentoMensalRepository,
                         UsuarioRepository usuarioRepository,
                         AuthorizationService authorizationService,
                         AuditLogService auditLogService) {
        this.clienteRepository = clienteRepository;
        this.pagamentoMensalRepository = pagamentoMensalRepository;
        this.usuarioRepository = usuarioRepository;
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<Cliente> listarTodos() {
        authorizationService.requirePermission(br.com.someli.domain.PermissaoCodigo.CLIENTES_VISUALIZAR);
        List<Cliente> clientes = clienteRepository.findAllWithResponsavel();
        List<Long> alcada = authorizationService.clienteIdsNaAlcadaAtual();
        if (alcada != null) {
            Set<Long> ids = new HashSet<>(alcada);
            clientes = clientes.stream().filter(c -> ids.contains(c.getId())).toList();
        }
        YearMonth atual = YearMonth.now();
        LocalDate hoje = LocalDate.now();
        Map<Long, Set<YearMonth>> pagosPorCliente = indexarPagamentosPagosInterno();
        Map<Long, Set<YearMonth>> naoCobraveis = indexarMesesNaoCobraveisInterno();

        for (Cliente c : clientes) {
            enriquecerStatusPagamento(
                    c,
                    atual,
                    hoje,
                    pagosPorCliente.getOrDefault(c.getId(), Set.of()),
                    naoCobraveis.getOrDefault(c.getId(), Set.of())
            );
        }
        return clientes;
    }

    public Map<Long, Set<YearMonth>> indexarPagamentosPagos() {
        return indexarPagamentosPagosInterno();
    }

    public Map<Long, Set<YearMonth>> indexarMesesNaoCobraveis() {
        return indexarMesesNaoCobraveisInterno();
    }

    public void enriquecerStatusPagamento(Cliente c, YearMonth referencia, LocalDate hoje,
                                          Set<YearMonth> pagos, Set<YearMonth> naoCobraveis) {
        YearMonth inicio = resolverInicioCobranca(c, referencia);
        YearMonth fim = resolverFimCobranca(c, referencia);
        List<YearMonth> pendentes = listarMesesPendentes(inicio, fim, pagos, naoCobraveis);
        int mesesPendentes = pendentes.size();

        if (Boolean.FALSE.equals(c.getAtivo())) {
            c.setStatus(mesesPendentes == 0 ? "em_dia" : "atrasado");
        } else {
            boolean pagoEsteMes = pagos.contains(referencia) || naoCobraveis.contains(referencia);
            c.setStatus(calcularStatus(c.getDiaVencimento(), hoje, pagoEsteMes, mesesPendentes));
        }

        c.setMesesPendentes(mesesPendentes);
        c.setMesesPendentesDetalhe(rotulosMeses(pendentes));
        BigDecimal honorario = c.getHonorario() != null ? c.getHonorario() : BigDecimal.ZERO;
        c.setValorPendente(honorario.multiply(BigDecimal.valueOf(mesesPendentes)));
    }

    private Map<Long, Set<YearMonth>> indexarPagamentosPagosInterno() {
        Map<Long, Set<YearMonth>> map = new HashMap<>();
        for (PagamentoMensal p : pagamentoMensalRepository.findAll()) {
            if (!Boolean.TRUE.equals(p.getPago()) || p.getClienteId() == null) {
                continue;
            }
            map.computeIfAbsent(p.getClienteId(), id -> new HashSet<>())
                    .add(YearMonth.of(p.getAno(), p.getMes()));
        }
        return map;
    }

    /** Meses marcados como sem cobrança (traço na planilha). */
    private Map<Long, Set<YearMonth>> indexarMesesNaoCobraveisInterno() {
        Map<Long, Set<YearMonth>> map = new HashMap<>();
        for (PagamentoMensal p : pagamentoMensalRepository.findAll()) {
            if (Boolean.FALSE.equals(p.getCobravel()) && p.getClienteId() != null) {
                map.computeIfAbsent(p.getClienteId(), id -> new HashSet<>())
                        .add(YearMonth.of(p.getAno(), p.getMes()));
            }
        }
        return map;
    }

    private List<YearMonth> listarMesesPendentes(YearMonth inicio, YearMonth fim,
                                                 Set<YearMonth> pagos, Set<YearMonth> naoCobraveis) {
        List<YearMonth> pendentes = new ArrayList<>();
        if (inicio == null || fim == null || inicio.isAfter(fim)) {
            return pendentes;
        }
        for (YearMonth cursor = inicio; !cursor.isAfter(fim); cursor = cursor.plusMonths(1)) {
            if (naoCobraveis.contains(cursor)) {
                continue;
            }
            if (!pagos.contains(cursor)) {
                pendentes.add(cursor);
            }
        }
        return pendentes;
    }

    private List<String> rotulosMeses(List<YearMonth> meses) {
        Locale pt = Locale.forLanguageTag("pt-BR");
        List<String> labels = new ArrayList<>();
        for (YearMonth ym : meses) {
            String mes = ym.getMonth().getDisplayName(TextStyle.SHORT, pt);
            mes = mes.substring(0, 1).toUpperCase(pt) + mes.substring(1);
            labels.add(mes + "/" + ym.getYear());
        }
        return labels;
    }

    private YearMonth resolverInicioCobranca(Cliente c, YearMonth atual) {
        if (c.getDataInicioCobranca() != null) {
            return YearMonth.from(c.getDataInicioCobranca());
        }
        // Não usar dataCriacao: no import ela é a data do cadastro, não o início da cobrança.
        return YearMonth.of(2026, 1);
    }

    /**
     * Último mês cobrado: para inativos, o mês anterior a data_fim_cobranca;
     * para ativos, o mês atual.
     */
    private YearMonth resolverFimCobranca(Cliente c, YearMonth atual) {
        if (Boolean.FALSE.equals(c.getAtivo()) && c.getDataFimCobranca() != null) {
            YearMonth fim = YearMonth.from(c.getDataFimCobranca()).minusMonths(1);
            return fim.isAfter(atual) ? atual : fim;
        }
        if (Boolean.FALSE.equals(c.getAtivo()) && c.getDataFimCobranca() == null) {
            // Inativo sem data de saída conhecida: não cobra mês atual se nunca houve movimento recente
            return atual.minusMonths(1).isBefore(YearMonth.of(2026, 1))
                    ? YearMonth.of(2026, 1)
                    : atual.minusMonths(1);
        }
        return atual;
    }

    /**
     * em_dia: mês atual pago e sem meses anteriores em aberto
     * pendente: só o mês atual em aberto e ainda dentro do vencimento
     * atrasado: vencimento do mês atual passou, ou há meses anteriores em aberto
     */
    private String calcularStatus(Integer diaVencimento, LocalDate hoje, boolean pagoMesAtual, int mesesPendentes) {
        if (pagoMesAtual && mesesPendentes == 0) {
            return "em_dia";
        }
        if (pagoMesAtual) {
            return "atrasado";
        }
        if (mesesPendentes > 1) {
            return "atrasado";
        }
        int dia = diaVencimento != null ? Math.min(diaVencimento, hoje.lengthOfMonth()) : 10;
        LocalDate vencimento = hoje.withDayOfMonth(dia);
        return hoje.isAfter(vencimento) ? "atrasado" : "pendente";
    }

    @Transactional(readOnly = true)
    public Cliente buscarPorId(Long id) {
        if (id == null) {
            throw new RegraNegocioException("ID do cliente é obrigatório");
        }
        authorizationService.requirePermission(br.com.someli.domain.PermissaoCodigo.CLIENTES_VISUALIZAR);
        authorizationService.requireCompanyAccess(id);
        Cliente c = clienteRepository.findByIdWithResponsavel(id)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado para o ID informado"));
        YearMonth atual = YearMonth.now();
        Set<YearMonth> pagos = new HashSet<>();
        Set<YearMonth> naoCobraveis = new HashSet<>();
        for (PagamentoMensal p : pagamentoMensalRepository.findByClienteId(c.getId())) {
            YearMonth ym = YearMonth.of(p.getAno(), p.getMes());
            if (Boolean.FALSE.equals(p.getCobravel())) {
                naoCobraveis.add(ym);
            } else if (Boolean.TRUE.equals(p.getPago())) {
                pagos.add(ym);
            }
        }
        enriquecerStatusPagamento(c, atual, LocalDate.now(), pagos, naoCobraveis);
        return c;
    }

    public Cliente criar(CreateClienteRequestDTO request) {
        authorizationService.requirePermission(br.com.someli.domain.PermissaoCodigo.CLIENTES_CADASTRAR);
        String cnpjNormalizado = normalizarCnpjOpcional(request.getCnpj());
        validarCnpjDuplicado(cnpjNormalizado, null);

        Cliente cliente = new Cliente();
        preencherCampos(cliente, request, cnpjNormalizado);
        if (!authorizationService.canViewHonorario() && request.getHonorario() != null) {
            // Sem permissão de honorário: não aceita valor no create (mantém zero)
            cliente.setHonorario(java.math.BigDecimal.ZERO);
        }
        Cliente salvo = Objects.requireNonNull(clienteRepository.save(cliente));
        auditLogService.registrar("CLIENTE_CRIAR", "CLIENTE", String.valueOf(salvo.getId()), null, salvo.getRazaoSocial());
        return salvo;
    }

    @SuppressWarnings("null")
    public Cliente atualizar(Long id, UpdateClienteRequestDTO request) {
        authorizationService.requirePermission(br.com.someli.domain.PermissaoCodigo.CLIENTES_EDITAR);
        Cliente cliente = buscarPorId(id);
        String cnpjNormalizado = normalizarCnpjOpcional(request.getCnpj());
        validarCnpjDuplicado(cnpjNormalizado, id);

        java.math.BigDecimal honorarioAnterior = cliente.getHonorario();
        boolean podeHonorario = authorizationService.hasPermission(br.com.someli.domain.PermissaoCodigo.HONORARIO_EDITAR)
                || authorizationService.canViewHonorario();

        preencherCampos(cliente, request, cnpjNormalizado);
        if (!podeHonorario) {
            cliente.setHonorario(honorarioAnterior);
        } else if (honorarioAnterior != null && request.getHonorario() != null
                && honorarioAnterior.compareTo(request.getHonorario()) != 0) {
            auditLogService.registrar("HONORARIO_ALTERAR", "CLIENTE", String.valueOf(id),
                    String.valueOf(honorarioAnterior), String.valueOf(request.getHonorario()));
        }
        Cliente clienteAtualizado = clienteRepository.save(cliente);
        return Objects.requireNonNull(clienteAtualizado);
    }

    public void remover(Long id) {
        authorizationService.requirePermission(br.com.someli.domain.PermissaoCodigo.CLIENTES_EXCLUIR);
        Cliente cliente = buscarPorId(id);
        auditLogService.registrar("CLIENTE_EXCLUIR", "CLIENTE", String.valueOf(id), cliente.getRazaoSocial(), null);
        clienteRepository.delete(Objects.requireNonNull(cliente));
    }

    private void preencherCampos(Cliente cliente, CreateClienteRequestDTO request, String cnpjNormalizado) {
        cliente.setCnpj(cnpjNormalizado);
        cliente.setRazaoSocial(request.getRazaoSocial().trim());
        cliente.setNomeFantasia(trimOrNull(request.getNomeFantasia()));
        cliente.setProprietario(trimOrNull(request.getProprietario()));
        cliente.setTelefone(trimOrNull(request.getTelefone()));
        cliente.setEmail(trimOrNull(request.getEmail()));
        cliente.setHonorario(request.getHonorario());
        cliente.setDiaVencimento(request.getDiaVencimento());
        cliente.setTipoPagamento(request.getTipoPagamento());
        cliente.setStatus(request.getStatus());
        cliente.setDataInicioCobranca(request.getDataInicioCobranca());
        cliente.setIndicacao(trimOrNull(request.getIndicacao()));
        cliente.setFormaPagamento(trimOrNull(request.getFormaPagamento()));
        cliente.setAtivo(request.getAtivo() != null ? request.getAtivo() : Boolean.TRUE);
        cliente.setResponsavel(resolverResponsavel(request.getResponsavelId()));
    }

    private Usuario resolverResponsavel(Long responsavelId) {
        if (responsavelId == null) {
            return null;
        }
        return usuarioRepository.findById(responsavelId)
                .orElseThrow(() -> new RegraNegocioException("Responsável não encontrado"));
    }

    private String normalizarCnpjOpcional(String cnpj) {
        if (cnpj == null || cnpj.isBlank()) {
            return null;
        }
        String digits = cnpj.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            return null;
        }
        if (digits.length() != 14) {
            throw new RegraNegocioException("CNPJ deve conter 14 dígitos");
        }
        return digits;
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validarCnpjDuplicado(String cnpj, Long idIgnorado) {
        if (cnpj == null || cnpj.isBlank()) {
            return;
        }
        boolean duplicado = idIgnorado == null
                ? clienteRepository.existsByCnpj(cnpj)
                : clienteRepository.existsByCnpjAndIdNot(cnpj, idIgnorado);
        if (duplicado) {
            throw new RegraNegocioException("Já existe cliente cadastrado com esse CNPJ");
        }
    }
}
