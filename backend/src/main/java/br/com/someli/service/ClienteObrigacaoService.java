package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.Obrigacao;
import br.com.someli.dto.CreateClienteObrigacaoRequestDTO;
import br.com.someli.dto.UpdateClienteObrigacaoRequestDTO;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.exception.ClienteObrigacaoNaoEncontradaException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ObrigacaoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
public class ClienteObrigacaoService {

    private final ClienteObrigacaoRepository clienteObrigacaoRepository;
    private final ClienteRepository clienteRepository;
    private final ObrigacaoRepository obrigacaoRepository;
    private final NotificationService notificationService;

    public ClienteObrigacaoService(ClienteObrigacaoRepository clienteObrigacaoRepository,
                                  ClienteRepository clienteRepository,
                                  ObrigacaoRepository obrigacaoRepository,
                                  NotificationService notificationService) {
        this.clienteObrigacaoRepository = clienteObrigacaoRepository;
        this.clienteRepository = clienteRepository;
        this.obrigacaoRepository = obrigacaoRepository;
        this.notificationService = notificationService;
    }

    public List<ClienteObrigacao> listarPorCliente(Long clienteId) {
        return clienteObrigacaoRepository.findByClienteIdAndAtivoTrueOrderByDataVencimentoAsc(clienteId);
    }

    public List<ClienteObrigacao> listarInativasPorCliente(Long clienteId) {
        return clienteObrigacaoRepository.findByClienteIdAndAtivoFalseOrderByDataVencimentoDesc(clienteId);
    }

    public ClienteObrigacao buscarPorId(Long id) {
        return clienteObrigacaoRepository.findByIdWithObrigacao(id)
                .orElseThrow(() -> new ClienteObrigacaoNaoEncontradaException("Obrigação do cliente não encontrada"));
    }

    public ClienteObrigacao criar(CreateClienteObrigacaoRequestDTO request) {
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
        co = clienteObrigacaoRepository.save(co);
        criarNotificacaoSeVencendoEmBreve(co);
        return co;
    }

    public ClienteObrigacao atualizar(Long id, UpdateClienteObrigacaoRequestDTO request) {
        ClienteObrigacao co = buscarPorId(id);
        validarDuplicidade(co.getCliente().getId(), co.getObrigacao().getId(), request.getDataVencimento(), id);

        co.setDataVencimento(request.getDataVencimento());
        co.setAtivo(request.getAtivo() != null ? request.getAtivo() : Boolean.TRUE);
        co.setObservacao(trimOrNull(request.getObservacao()));
        return clienteObrigacaoRepository.save(co);
    }

    public void remover(Long id) {
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

    private void criarNotificacaoSeVencendoEmBreve(ClienteObrigacao co) {
        LocalDate hoje = LocalDate.now();
        LocalDate vencimento = co.getDataVencimento();
        int diasAntecedencia = co.getObrigacao().getDiasAntecedenciaAlerta() != null
                ? co.getObrigacao().getDiasAntecedenciaAlerta()
                : 7;
        LocalDate dataAlerta = vencimento.minusDays(diasAntecedencia);
        if (hoje.isBefore(dataAlerta)) return;
        String prioridade = vencimento.isBefore(hoje) ? "critica" : "normal";
        String titulo = vencimento.isBefore(hoje)
                ? "Obrigação ATRASADA: " + co.getObrigacao().getNome()
                : "Obrigação vencendo: " + co.getObrigacao().getNome();
        String descricao = String.format("Cliente: %s | Vencimento: %s | %s",
                co.getCliente().getRazaoSocial(),
                vencimento,
                co.getObservacao() != null ? co.getObservacao() : "");
        try {
            notificationService.criar(co, titulo, descricao.trim(), prioridade);
        } catch (Exception ignored) {}
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
}
