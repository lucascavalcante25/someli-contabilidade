package br.com.someli.service;

import br.com.someli.domain.PagamentoMensal;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.BoletoEnviadoDTO;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.PagamentoMensalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class PagamentoMensalService {

    private final PagamentoMensalRepository pagamentoMensalRepository;
    private final ClienteRepository clienteRepository;
    private final TagSyncService tagSyncService;
    private final AuthorizationService authorizationService;

    public PagamentoMensalService(PagamentoMensalRepository pagamentoMensalRepository,
                                  ClienteRepository clienteRepository,
                                  TagSyncService tagSyncService,
                                  AuthorizationService authorizationService) {
        this.pagamentoMensalRepository = pagamentoMensalRepository;
        this.clienteRepository = clienteRepository;
        this.tagSyncService = tagSyncService;
        this.authorizationService = authorizationService;
    }

    /**
     * Marca/desmarca o boleto do mês como enviado. Não mexe em "pago":
     * cria o registro do mês com pago=false se ainda não existir.
     */
    @Transactional
    public BoletoEnviadoDTO alterarBoletoEnviado(Long clienteId, int mes, int ano, boolean enviado) {
        authorizationService.requirePermission(enviado ? PermissaoCodigo.FINANCEIRO_LANCAR : PermissaoCodigo.FINANCEIRO_EDITAR);
        authorizationService.requireCompanyAccess(clienteId);
        if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
            throw new RegraNegocioException("Mês ou ano inválido");
        }
        if (!clienteRepository.existsById(clienteId)) {
            throw new ClienteNaoEncontradoException("Cliente não encontrado");
        }
        PagamentoMensal pm = pagamentoMensalRepository.findByClienteIdAndMesAndAno(clienteId, mes, ano)
                .orElseGet(() -> {
                    PagamentoMensal novo = new PagamentoMensal();
                    novo.setClienteId(clienteId);
                    novo.setMes(mes);
                    novo.setAno(ano);
                    return novo;
                });
        pm.setBoletoEnviado(enviado);
        pm.setBoletoEnviadoEm(enviado ? LocalDateTime.now() : null);
        pm.setBoletoEnviadoPor(enviado ? nomeUsuarioAtual() : null);
        PagamentoMensal salvo = pagamentoMensalRepository.save(pm);
        return new BoletoEnviadoDTO(clienteId, mes, ano, Boolean.TRUE.equals(salvo.getBoletoEnviado()),
                salvo.getBoletoEnviadoEm(), salvo.getBoletoEnviadoPor());
    }

    private String nomeUsuarioAtual() {
        Usuario u = authorizationService.currentUser();
        if (u == null || u.getNome() == null) return null;
        String nome = u.getNome().trim();
        return nome.length() > 120 ? nome.substring(0, 120) : nome;
    }

    @Transactional
    public void marcarPago(Long clienteId, int mes, int ano) {
        if (!clienteRepository.existsById(clienteId)) {
            throw new IllegalArgumentException("Cliente não encontrado");
        }
        PagamentoMensal pm = pagamentoMensalRepository.findByClienteIdAndMesAndAno(clienteId, mes, ano)
                .orElseGet(() -> {
                    PagamentoMensal novo = new PagamentoMensal();
                    novo.setClienteId(clienteId);
                    novo.setMes(mes);
                    novo.setAno(ano);
                    return novo;
                });
        pm.setPago(true);
        pagamentoMensalRepository.save(pm);
        tagSyncService.sincronizarCliente(clienteId);
    }

    @Transactional
    public void desmarcarPago(Long clienteId, int mes, int ano) {
        Optional<PagamentoMensal> opt = pagamentoMensalRepository.findByClienteIdAndMesAndAno(clienteId, mes, ano);
        opt.ifPresent(pm -> {
            pm.setPago(false);
            pagamentoMensalRepository.save(pm);
        });
        tagSyncService.sincronizarCliente(clienteId);
    }

    public boolean isPago(Long clienteId, int mes, int ano) {
        return pagamentoMensalRepository.findByClienteIdAndMesAndAno(clienteId, mes, ano)
                .map(PagamentoMensal::getPago)
                .orElse(false);
    }
}
