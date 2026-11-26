package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.RegimeRtc;
import br.com.someli.domain.SimulacaoRtcCenario;
import br.com.someli.dto.SimulacaoRtcCalcularRequest;
import br.com.someli.dto.SimulacaoRtcCenarioDTO;
import br.com.someli.dto.SimulacaoRtcCenarioSalvarRequest;
import br.com.someli.dto.SimulacaoRtcResultadoDTO;
import br.com.someli.dto.SimulacaoRtcVersaoDTO;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.exception.ExternalApiException;
import br.com.someli.exception.SimulacaoRtcCenarioNaoEncontradoException;
import br.com.someli.integration.CalculadoraRtcClient;
import br.com.someli.integration.RespostaRtc;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.SimulacaoRtcCenarioRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Simulador CBS/IBS/IS: repassa a operação para a calculadora oficial da Receita e guarda cenários por cliente.
 * Nenhuma conta tributária é feita aqui.
 */
@Service
public class SimuladorRtcService {

    static final int MAX_ITENS = 50;
    static final int MAX_JSON = 200_000;

    private final CalculadoraRtcClient client;
    private final SimulacaoRtcCenarioRepository cenarioRepository;
    private final ClienteRepository clienteRepository;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public SimuladorRtcService(CalculadoraRtcClient client,
                               SimulacaoRtcCenarioRepository cenarioRepository,
                               ClienteRepository clienteRepository,
                               AuthorizationService authorizationService,
                               AuditLogService auditLogService,
                               ObjectMapper objectMapper) {
        this.client = client;
        this.cenarioRepository = cenarioRepository;
        this.clienteRepository = clienteRepository;
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
    }

    public SimulacaoRtcResultadoDTO calcular(SimulacaoRtcCalcularRequest request) {
        authorizationService.requirePermission(PermissaoCodigo.SIMULADOR_RTC_USAR);
        validarOperacao(request.operacao());
        RespostaRtc resposta = client.calcular(request.regime(), request.operacao());
        return new SimulacaoRtcResultadoDTO(request.regime(), resposta.versaoCalculadora(), resposta.versaoBase(),
                resposta.avisoDadosSimulados(), resposta.corpo());
    }

    public List<SimulacaoRtcVersaoDTO> versoes() {
        authorizationService.requirePermission(PermissaoCodigo.SIMULADOR_RTC_USAR);
        List<SimulacaoRtcVersaoDTO> versoes = new ArrayList<>();
        for (RegimeRtc regime : RegimeRtc.values()) {
            try {
                versoes.add(new SimulacaoRtcVersaoDTO(regime, true, client.versao(regime), null));
            } catch (ExternalApiException e) {
                versoes.add(new SimulacaoRtcVersaoDTO(regime, false, null, e.getMessage()));
            }
        }
        return versoes;
    }

    @Transactional(readOnly = true)
    public List<SimulacaoRtcCenarioDTO> listarCenarios(Long clienteId) {
        authorizationService.requirePermission(PermissaoCodigo.SIMULADOR_RTC_USAR);
        authorizationService.requireCompanyAccess(clienteId);
        return cenarioRepository.findAtivosByClienteId(clienteId).stream().map(this::dto).toList();
    }

    @Transactional
    public SimulacaoRtcCenarioDTO salvarCenario(Long clienteId, SimulacaoRtcCenarioSalvarRequest request) {
        authorizationService.requirePermission(PermissaoCodigo.SIMULADOR_RTC_USAR);
        authorizationService.requireCompanyAccess(clienteId);
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado"));
        validarOperacao(request.operacao());
        // O resultado salvo é sempre o que a calculadora devolveu agora, nunca um valor vindo do navegador.
        RespostaRtc resposta = client.calcular(request.regime(), request.operacao());

        SimulacaoRtcCenario cenario = new SimulacaoRtcCenario();
        cenario.setCliente(cliente);
        cenario.setNome(request.nome().trim());
        cenario.setRegime(request.regime());
        cenario.setObservacao(textoOuNulo(request.observacao()));
        cenario.setEntrada(escrever(request.operacao()));
        cenario.setResultado(escrever(resposta.corpo()));
        cenario.setVersaoCalculadora(limitar(resposta.versaoCalculadora(), 40));
        cenario.setVersaoBase(limitar(resposta.versaoBase(), 40));
        cenario.setAvisoDadosSimulados(limitar(resposta.avisoDadosSimulados(), 200));
        cenario.setAtivo(true);
        cenario.setCriadoPor(authorizationService.currentUser());
        SimulacaoRtcCenario salvo = cenarioRepository.save(cenario);
        auditar("SIMULACAO_RTC_SALVAR", salvo);
        return dto(salvo);
    }

    @Transactional(readOnly = true)
    public SimulacaoRtcCenarioDTO obterCenario(Long id) {
        authorizationService.requirePermission(PermissaoCodigo.SIMULADOR_RTC_USAR);
        SimulacaoRtcCenario cenario = carregarAtivo(id);
        authorizationService.requireCompanyAccess(cenario.getCliente().getId());
        return dto(cenario);
    }

    @Transactional
    public void excluirCenario(Long id) {
        authorizationService.requirePermission(PermissaoCodigo.SIMULADOR_RTC_USAR);
        SimulacaoRtcCenario cenario = carregarAtivo(id);
        authorizationService.requireCompanyAccess(cenario.getCliente().getId());
        cenario.setAtivo(false);
        cenarioRepository.save(cenario);
        auditar("SIMULACAO_RTC_EXCLUIR", cenario);
    }

    private SimulacaoRtcCenario carregarAtivo(Long id) {
        SimulacaoRtcCenario cenario = cenarioRepository.findDetalheById(id)
                .orElseThrow(SimulacaoRtcCenarioNaoEncontradoException::new);
        if (!cenario.isAtivo()) throw new SimulacaoRtcCenarioNaoEncontradoException();
        return cenario;
    }

    private void validarOperacao(JsonNode operacao) {
        if (operacao == null || !operacao.isObject()) {
            throw new IllegalArgumentException("Operação inválida");
        }
        JsonNode itens = operacao.get("itens");
        if (itens == null || !itens.isArray() || itens.isEmpty()) {
            throw new IllegalArgumentException("Informe pelo menos um item na operação");
        }
        if (itens.size() > MAX_ITENS) {
            throw new IllegalArgumentException("A simulação aceita até " + MAX_ITENS + " itens");
        }
        if (escrever(operacao).length() > MAX_JSON) {
            throw new IllegalArgumentException("Operação grande demais para simular");
        }
    }

    private SimulacaoRtcCenarioDTO dto(SimulacaoRtcCenario c) {
        return new SimulacaoRtcCenarioDTO(
                c.getId(),
                c.getCliente().getId(),
                c.getNome(),
                c.getRegime(),
                c.getObservacao(),
                ler(c.getEntrada()),
                ler(c.getResultado()),
                c.getVersaoCalculadora(),
                c.getVersaoBase(),
                c.getAvisoDadosSimulados(),
                c.getCriadoPor() == null ? null : c.getCriadoPor().getNome(),
                c.getCriadoEm()
        );
    }

    private String escrever(JsonNode json) {
        try {
            return objectMapper.writeValueAsString(json);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Operação inválida");
        }
    }

    private JsonNode ler(String texto) {
        try {
            return texto == null ? null : objectMapper.readTree(texto);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private static String textoOuNulo(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }

    private static String limitar(String texto, int max) {
        if (texto == null) return null;
        return texto.length() > max ? texto.substring(0, max) : texto;
    }

    private void auditar(String acao, SimulacaoRtcCenario cenario) {
        auditLogService.registrar(acao, "CLIENTE", String.valueOf(cenario.getCliente().getId()), null,
                "simulação CBS/IBS: " + cenario.getNome());
    }
}
