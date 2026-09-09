package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.Obrigacao;
import br.com.someli.domain.PeriodicidadeObrigacao;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.AplicarObrigacoesEmMassaRequestDTO;
import br.com.someli.dto.CreateClienteObrigacaoRequestDTO;
import br.com.someli.dto.UpdateClienteObrigacaoRequestDTO;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.exception.ClienteObrigacaoNaoEncontradaException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ObrigacaoRepository;
import br.com.someli.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class ClienteObrigacaoService {

    private final ClienteObrigacaoRepository clienteObrigacaoRepository;
    private final ClienteRepository clienteRepository;
    private final ObrigacaoRepository obrigacaoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuthorizationService authorizationService;
    private final ObrigacaoOcorrenciaService ocorrenciaService;

    public ClienteObrigacaoService(ClienteObrigacaoRepository clienteObrigacaoRepository,
                                  ClienteRepository clienteRepository,
                                  ObrigacaoRepository obrigacaoRepository,
                                  UsuarioRepository usuarioRepository,
                                  AuthorizationService authorizationService,
                                  ObrigacaoOcorrenciaService ocorrenciaService) {
        this.clienteObrigacaoRepository = clienteObrigacaoRepository;
        this.clienteRepository = clienteRepository;
        this.obrigacaoRepository = obrigacaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.authorizationService = authorizationService;
        this.ocorrenciaService = ocorrenciaService;
    }

    public List<ClienteObrigacao> listarPorCliente(Long clienteId) {
        authorizationService.requireCompanyAccess(clienteId);
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_VISUALIZAR);
        return clienteObrigacaoRepository.findByClienteIdAndAtivoTrueOrderByDataVencimentoAsc(clienteId);
    }

    public List<ClienteObrigacao> listarInativasPorCliente(Long clienteId) {
        authorizationService.requireCompanyAccess(clienteId);
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_VISUALIZAR);
        return clienteObrigacaoRepository.findByClienteIdAndAtivoFalseOrderByDataVencimentoDesc(clienteId);
    }

    public ClienteObrigacao buscarPorId(Long id) {
        ClienteObrigacao co = clienteObrigacaoRepository.findByIdWithObrigacao(id)
                .orElseThrow(() -> new ClienteObrigacaoNaoEncontradaException("Obrigação do cliente não encontrada"));
        authorizationService.requireCompanyAccess(co.getCliente().getId());
        return co;
    }

    @Transactional
    public ClienteObrigacao criar(CreateClienteObrigacaoRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_CRIAR);
        authorizationService.requireCompanyAccess(request.getClienteId());

        Cliente cliente = clienteRepository.findById(request.getClienteId())
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado"));
        Obrigacao obrigacao = obrigacaoRepository.findById(request.getObrigacaoId())
                .orElseThrow(() -> new RegraNegocioException("Obrigação não encontrada"));

        validarDuplicidade(request.getClienteId(), request.getObrigacaoId(), request.getDataVencimento(), null);

        ClienteObrigacao co = new ClienteObrigacao();
        co.setCliente(cliente);
        co.setObrigacao(obrigacao);
        co.setDataVencimento(request.getDataVencimento());
        co.setAtivo(request.getAtivo() != null ? request.getAtivo() : Boolean.TRUE);
        co.setObservacao(trimOrNull(request.getObservacao()));
        co.setPeriodicidade(request.getPeriodicidade() != null ? request.getPeriodicidade()
                : (obrigacao.getPeriodicidadePadrao() != null ? obrigacao.getPeriodicidadePadrao() : PeriodicidadeObrigacao.UNICA));
        co.setDiaVencimento(request.getDiaVencimento() != null ? request.getDiaVencimento()
                : (obrigacao.getDiaVencimentoPadrao() != null ? obrigacao.getDiaVencimentoPadrao()
                : request.getDataVencimento().getDayOfMonth()));
        co.setTipoRegraVencimento(request.getTipoRegraVencimento() != null ? request.getTipoRegraVencimento()
                : (obrigacao.getTipoRegraVencimento() != null ? obrigacao.getTipoRegraVencimento() : "DIA_FIXO"));
        co.setSetor(request.getSetor() != null ? request.getSetor() : obrigacao.getSetor());
        co.setDiasAntecedenciaAlerta(request.getDiasAntecedenciaAlerta() != null
                ? request.getDiasAntecedenciaAlerta() : obrigacao.getDiasAntecedenciaAlerta());
        if (request.getResponsavelUsuarioId() != null) {
            Usuario resp = usuarioRepository.findById(request.getResponsavelUsuarioId())
                    .orElseThrow(() -> new RegraNegocioException("Responsável não encontrado"));
            co.setResponsavel(resp);
        }
        co = clienteObrigacaoRepository.save(co);

        String competencia = ObrigacaoOcorrenciaService.competenciaDe(co.getDataVencimento(), co.getPeriodicidade());
        ocorrenciaService.criarParaConfig(co, co.getDataVencimento(), competencia);
        return co;
    }

    public ClienteObrigacao atualizar(Long id, UpdateClienteObrigacaoRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_EDITAR);
        ClienteObrigacao co = buscarPorId(id);
        validarDuplicidade(co.getCliente().getId(), co.getObrigacao().getId(), request.getDataVencimento(), id);

        co.setDataVencimento(request.getDataVencimento());
        co.setAtivo(request.getAtivo() != null ? request.getAtivo() : Boolean.TRUE);
        co.setObservacao(trimOrNull(request.getObservacao()));
        return clienteObrigacaoRepository.save(co);
    }

    public void remover(Long id) {
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_EXCLUIR);
        clienteObrigacaoRepository.delete(buscarPorId(id));
    }

    private void validarDuplicidade(Long clienteId, Long obrigacaoId, LocalDate dataVencimento, Long idIgnorado) {
        boolean duplicado = idIgnorado == null
                ? clienteObrigacaoRepository.existsByClienteIdAndObrigacaoIdAndDataVencimentoAndAtivoTrue(clienteId, obrigacaoId, dataVencimento)
                : clienteObrigacaoRepository.existsByClienteIdAndObrigacaoIdAndDataVencimentoAndAtivoTrueAndIdNot(clienteId, obrigacaoId, dataVencimento, idIgnorado);
        if (duplicado) {
            throw new RegraNegocioException("Já existe esta obrigação cadastrada para o cliente na mesma data de vencimento");
        }
    }

    private String trimOrNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    public List<ClienteObrigacao> listarVencendoHoje() {
        return clienteObrigacaoRepository.findVencendoNaData(LocalDate.now());
    }

    public List<ClienteObrigacao> listarVencendoEmBreve(int dias) {
        LocalDate hoje = LocalDate.now();
        LocalDate ate = hoje.plusDays(dias);
        return clienteObrigacaoRepository.findAtivasComVencimentoAte(ate)
                .stream()
                .filter(co -> !co.getDataVencimento().isBefore(hoje) && co.getDataVencimento().isAfter(hoje))
                .toList();
    }

    public List<ClienteObrigacao> listarAtrasadas() {
        return clienteObrigacaoRepository.findAtivasComVencimentoAte(LocalDate.now().minusDays(1));
    }

    /**
     * Aplica a mesma obrigação a vários clientes. Ignora quem já possui vínculo ativo.
     * @return quantidade criada
     */
    @Transactional
    public int aplicarEmMassa(AplicarObrigacoesEmMassaRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_CRIAR);
        if (request.getClienteIds() == null || request.getClienteIds().isEmpty()) {
            throw new RegraNegocioException("Informe ao menos um cliente");
        }
        java.util.Set<Long> alvo = new java.util.HashSet<>(request.getClienteIds());
        if (request.getTagId() != null) {
            java.util.Set<Long> comTag = new java.util.HashSet<>(
                    clienteRepository.findClienteIdsByTagId(request.getTagId()));
            alvo.retainAll(comTag);
        }
        int criadas = 0;
        for (Long clienteId : alvo) {
            if (clienteId == null) continue;
            if (!authorizationService.canAccessCompany(authorizationService.currentUser(), clienteId)) {
                continue;
            }
            if (clienteObrigacaoRepository.existsByClienteIdAndObrigacaoIdAndAtivoTrue(clienteId, request.getObrigacaoId())) {
                continue;
            }
            CreateClienteObrigacaoRequestDTO one = new CreateClienteObrigacaoRequestDTO();
            one.setClienteId(clienteId);
            one.setObrigacaoId(request.getObrigacaoId());
            one.setDataVencimento(request.getDataVencimento());
            one.setPeriodicidade(request.getPeriodicidade());
            one.setDiaVencimento(request.getDiaVencimento());
            one.setSetor(request.getSetor());
            one.setObservacao(request.getObservacao());
            one.setAtivo(true);
            criar(one);
            criadas++;
        }
        return criadas;
    }
}
