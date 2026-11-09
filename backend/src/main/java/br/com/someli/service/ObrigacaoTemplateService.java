package br.com.someli.service;

import br.com.someli.domain.Obrigacao;
import br.com.someli.domain.ObrigacaoTemplate;
import br.com.someli.domain.ObrigacaoTemplateItem;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.AplicarTemplateRequestDTO;
import br.com.someli.dto.CreateClienteObrigacaoRequestDTO;
import br.com.someli.dto.ObrigacaoTemplateDTO;
import br.com.someli.dto.ObrigacaoTemplateItemDTO;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ObrigacaoTemplateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ObrigacaoTemplateService {

    private final ObrigacaoTemplateRepository templateRepository;
    private final ClienteRepository clienteRepository;
    private final ClienteObrigacaoRepository clienteObrigacaoRepository;
    private final ClienteObrigacaoService clienteObrigacaoService;
    private final AuthorizationService authorizationService;

    public ObrigacaoTemplateService(ObrigacaoTemplateRepository templateRepository,
                                    ClienteRepository clienteRepository,
                                    ClienteObrigacaoRepository clienteObrigacaoRepository,
                                    ClienteObrigacaoService clienteObrigacaoService,
                                    AuthorizationService authorizationService) {
        this.templateRepository = templateRepository;
        this.clienteRepository = clienteRepository;
        this.clienteObrigacaoRepository = clienteObrigacaoRepository;
        this.clienteObrigacaoService = clienteObrigacaoService;
        this.authorizationService = authorizationService;
    }

    @Transactional(readOnly = true)
    public List<ObrigacaoTemplateDTO> listar() {
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_VISUALIZAR);
        return templateRepository.findAllAtivosWithItens().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public ObrigacaoTemplateDTO buscarPorCodigo(String codigo) {
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_VISUALIZAR);
        ObrigacaoTemplate t = templateRepository.findByCodigoWithItens(codigo)
                .orElseThrow(() -> new RegraNegocioException("Template não encontrado: " + codigo));
        return toDto(t);
    }

    /**
     * Aplica todos os itens do template aos clientes informados (ou ao regime).
     * Reutiliza a criação individual — ignora vínculos já existentes.
     */
    @Transactional
    public Map<String, Object> aplicar(String codigo, AplicarTemplateRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_CRIAR);
        if (request.getDataVencimento() == null) {
            throw new RegraNegocioException("Informe a data de vencimento inicial");
        }

        ObrigacaoTemplate template = templateRepository.findByCodigoWithItens(codigo)
                .orElseThrow(() -> new RegraNegocioException("Template não encontrado: " + codigo));

        Set<Long> alvo = resolverAlvo(template, request);
        List<String> obrigacaoNomes = template.getItens().stream()
                .filter(i -> i.getObrigacao() != null && i.getObrigacao().getNome() != null)
                .sorted((a, b) -> Integer.compare(
                        a.getOrdem() != null ? a.getOrdem() : 0,
                        b.getOrdem() != null ? b.getOrdem() : 0))
                .map(i -> i.getObrigacao().getNome())
                .distinct()
                .toList();

        if (alvo.isEmpty()) {
            throw new RegraNegocioException(
                    "Nenhum cliente elegível para o regime "
                            + template.getRegime().replace('_', ' ')
                            + ". Cadastre o regime tributário nos clientes ativos (Clientes → Editar) para torná-los elegíveis.");
        }

        int vinculosCriados = 0;
        int clientesAtingidos = 0;
        int vinculosIgnorados = 0;
        for (Long clienteId : alvo) {
            if (!authorizationService.canAccessCompany(authorizationService.currentUser(), clienteId)) {
                continue;
            }
            boolean algum = false;
            for (ObrigacaoTemplateItem item : template.getItens()) {
                if (item.getObrigacao() == null) continue;
                Long obrigacaoId = item.getObrigacao().getId();
                if (clienteObrigacaoRepository.existsByClienteIdAndObrigacaoIdAndAtivoTrue(clienteId, obrigacaoId)) {
                    vinculosIgnorados++;
                    continue;
                }
                CreateClienteObrigacaoRequestDTO one = new CreateClienteObrigacaoRequestDTO();
                one.setClienteId(clienteId);
                one.setObrigacaoId(obrigacaoId);
                one.setDataVencimento(ajustarVencimento(request.getDataVencimento(), item.getDiaVencimento()));
                one.setPeriodicidade(item.getPeriodicidade() != null ? item.getPeriodicidade()
                        : item.getObrigacao().getPeriodicidadePadrao());
                one.setDiaVencimento(item.getDiaVencimento() != null ? item.getDiaVencimento()
                        : item.getObrigacao().getDiaVencimentoPadrao());
                one.setSetor(item.getObrigacao().getSetor());
                one.setObservacao(request.getObservacao());
                one.setAtivo(true);
                clienteObrigacaoService.criar(one);
                vinculosCriados++;
                algum = true;
            }
            if (algum) clientesAtingidos++;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("templateCodigo", template.getCodigo());
        result.put("regime", template.getRegime());
        result.put("obrigacaoNomes", obrigacaoNomes);
        result.put("clientesAlvo", alvo.size());
        result.put("clientesAtingidos", clientesAtingidos);
        result.put("vinculosCriados", vinculosCriados);
        result.put("vinculosIgnorados", vinculosIgnorados);
        return result;
    }

    private Set<Long> resolverAlvo(ObrigacaoTemplate template, AplicarTemplateRequestDTO request) {
        Set<Long> alvo = new HashSet<>();
        if (Boolean.TRUE.equals(request.getApenasDoRegime())) {
            alvo.addAll(clienteRepository.findAtivoIdsByRegime(template.getRegime()));
        }
        if (request.getClienteIds() != null) {
            alvo.addAll(request.getClienteIds());
        }
        if (request.getTagId() != null && !alvo.isEmpty()) {
            Set<Long> comTag = new HashSet<>(clienteRepository.findClienteIdsByTagId(request.getTagId()));
            alvo.retainAll(comTag);
        } else if (request.getTagId() != null) {
            alvo.addAll(clienteRepository.findClienteIdsByTagId(request.getTagId()));
        }
        return alvo;
    }

    private LocalDate ajustarVencimento(LocalDate base, Integer dia) {
        if (dia == null) return base;
        int max = base.lengthOfMonth();
        return base.withDayOfMonth(Math.min(Math.max(dia, 1), max));
    }

    private ObrigacaoTemplateDTO toDto(ObrigacaoTemplate t) {
        ObrigacaoTemplateDTO dto = new ObrigacaoTemplateDTO();
        dto.setId(t.getId());
        dto.setCodigo(t.getCodigo());
        dto.setNome(t.getNome());
        dto.setRegime(t.getRegime());
        dto.setDescricao(t.getDescricao());
        if (t.getItens() != null) {
            for (ObrigacaoTemplateItem item : t.getItens()) {
                ObrigacaoTemplateItemDTO idto = new ObrigacaoTemplateItemDTO();
                Obrigacao o = item.getObrigacao();
                if (o != null) {
                    idto.setObrigacaoId(o.getId());
                    idto.setObrigacaoNome(o.getNome());
                    idto.setSetor(o.getSetor());
                }
                idto.setPeriodicidade(item.getPeriodicidade());
                idto.setDiaVencimento(item.getDiaVencimento());
                idto.setOrdem(item.getOrdem());
                dto.getItens().add(idto);
            }
        }
        return dto;
    }
}
