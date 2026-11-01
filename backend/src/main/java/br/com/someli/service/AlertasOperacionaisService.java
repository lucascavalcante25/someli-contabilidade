package br.com.someli.service;

import br.com.someli.domain.CertificadoDigitalStatus;
import br.com.someli.domain.Cliente;
import br.com.someli.domain.ObrigacaoOcorrencia;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.StatusObrigacaoOcorrencia;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.AlertasOperacionaisDTO;
import br.com.someli.dto.CertificadoAlertaDTO;
import br.com.someli.mapper.ObrigacaoOcorrenciaMapper;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class AlertasOperacionaisService {

    private final ObrigacaoOcorrenciaRepository ocorrenciaRepository;
    private final ClienteRepository clienteRepository;
    private final ClienteService clienteService;
    private final AuthorizationService authorizationService;

    public AlertasOperacionaisService(ObrigacaoOcorrenciaRepository ocorrenciaRepository,
                                      ClienteRepository clienteRepository,
                                      ClienteService clienteService,
                                      AuthorizationService authorizationService) {
        this.ocorrenciaRepository = ocorrenciaRepository;
        this.clienteRepository = clienteRepository;
        this.clienteService = clienteService;
        this.authorizationService = authorizationService;
    }

    @Transactional(readOnly = true)
    public AlertasOperacionaisDTO obter() {
        authorizationService.requirePermission(PermissaoCodigo.DASHBOARD_VISUALIZAR);
        Usuario u = authorizationService.currentUser();
        LocalDate hoje = LocalDate.now();
        List<Long> alcada = authorizationService.clienteIdsNaAlcada(u);
        Set<Long> alcadaSet = alcada == null ? null : new HashSet<>(alcada);

        List<ObrigacaoOcorrencia> abertas = ocorrenciaRepository.findAbertasComVencimentoAte(hoje.plusDays(30))
                .stream()
                .filter(oo -> alcadaSet == null || alcadaSet.contains(oo.getClienteObrigacao().getCliente().getId()))
                .filter(oo -> authorizationService.hasAlcadaGlobal(u)
                        || authorizationService.canAccessDepartment(u,
                        oo.getClienteObrigacao().getCliente().getId(),
                        oo.getClienteObrigacao().resolverSetor()))
                .toList();

        List<ObrigacaoOcorrencia> hojeList = abertas.stream()
                .filter(oo -> oo.getDataVencimento().equals(hoje)).toList();
        List<ObrigacaoOcorrencia> proximas = abertas.stream()
                .filter(oo -> oo.getDataVencimento().isAfter(hoje) && !oo.getDataVencimento().isAfter(hoje.plusDays(7)))
                .toList();
        List<ObrigacaoOcorrencia> atrasadas = abertas.stream()
                .filter(oo -> oo.getDataVencimento().isBefore(hoje)).toList();
        List<ObrigacaoOcorrencia> dasPgdas = abertas.stream()
                .filter(this::isDasOuPgdas)
                .sorted((a, b) -> a.getDataVencimento().compareTo(b.getDataVencimento()))
                .toList();

        List<Cliente> clientes = clienteRepository.findAllWithResponsavel().stream()
                .filter(c -> Boolean.TRUE.equals(c.getAtivo()))
                .filter(c -> alcadaSet == null || alcadaSet.contains(c.getId()))
                .toList();

        YearMonth atual = YearMonth.now();
        Map<Long, Set<YearMonth>> pagos = clienteService.indexarPagamentosPagos();
        Map<Long, Set<YearMonth>> naoCobraveis = clienteService.indexarMesesNaoCobraveis();

        List<CertificadoAlertaDTO> certs = new ArrayList<>();
        List<AlertasOperacionaisDTO.ClienteResumoAlertaDTO> inad = new ArrayList<>();

        for (Cliente c : clientes) {
            clienteService.enriquecerStatusPagamento(
                    c, atual, hoje,
                    pagos.getOrDefault(c.getId(), Set.of()),
                    naoCobraveis.getOrDefault(c.getId(), Set.of()));

            CertificadoDigitalStatus st = CertificadoDigitalStatus.de(
                    c.getCertificadoVencimento(), hoje, CertificadoDigitalStatus.DIAS_ALERTA_PADRAO);
            if (st == CertificadoDigitalStatus.VENCENDO || st == CertificadoDigitalStatus.VENCIDO) {
                CertificadoAlertaDTO a = new CertificadoAlertaDTO();
                a.setClienteId(c.getId());
                a.setRazaoSocial(c.getRazaoSocial());
                a.setCnpj(c.getCnpj());
                a.setCertificadoVencimento(c.getCertificadoVencimento());
                a.setCertificadoTipo(c.getCertificadoTipo());
                a.setStatus(st.name());
                a.setDiasRestantes(CertificadoDigitalStatus.diasRestantes(c.getCertificadoVencimento(), hoje));
                certs.add(a);
            }

            if ("atrasado".equalsIgnoreCase(c.getStatus())
                    || (c.getMesesPendentes() != null && c.getMesesPendentes() > 0)) {
                AlertasOperacionaisDTO.ClienteResumoAlertaDTO item = new AlertasOperacionaisDTO.ClienteResumoAlertaDTO();
                item.setId(c.getId());
                item.setRazaoSocial(c.getRazaoSocial());
                item.setStatus(c.getStatus());
                item.setMesesPendentes(c.getMesesPendentes());
                item.setValorPendente(c.getValorPendente());
                inad.add(item);
            }
        }

        certs.sort((a, b) -> {
            if (a.getCertificadoVencimento() == null) return 1;
            if (b.getCertificadoVencimento() == null) return -1;
            return a.getCertificadoVencimento().compareTo(b.getCertificadoVencimento());
        });

        AlertasOperacionaisDTO dto = new AlertasOperacionaisDTO();
        dto.setObrigacoesVencendoHoje(hojeList.size());
        dto.setObrigacoesVencendoEmBreve(proximas.size());
        dto.setObrigacoesAtrasadas(atrasadas.size());
        dto.setDasPgdasAbertas(dasPgdas.size());
        dto.setCertificadosVencendo(certs.stream().filter(c -> "VENCENDO".equals(c.getStatus())).count());
        dto.setCertificadosVencidos(certs.stream().filter(c -> "VENCIDO".equals(c.getStatus())).count());
        dto.setInadimplentes(inad.size());
        dto.setObrigacoesAtrasadasItens(atrasadas.stream().limit(20).map(ObrigacaoOcorrenciaMapper::toDto).toList());
        List<br.com.someli.dto.ObrigacaoOcorrenciaDTO> proximasItens = new ArrayList<>(
                hojeList.stream().limit(12).map(ObrigacaoOcorrenciaMapper::toDto).toList());
        proximasItens.addAll(proximas.stream().limit(12).map(ObrigacaoOcorrenciaMapper::toDto).toList());
        dto.setObrigacoesProximasItens(proximasItens);
        dto.setDasPgdasItens(dasPgdas.stream().limit(20).map(ObrigacaoOcorrenciaMapper::toDto).toList());
        dto.setCertificados(certs.stream().limit(30).toList());
        dto.setInadimplentesItens(inad.stream().limit(20).toList());
        return dto;
    }

    private boolean isDasOuPgdas(ObrigacaoOcorrencia oo) {
        if (oo.getClienteObrigacao() == null || oo.getClienteObrigacao().getObrigacao() == null) {
            return false;
        }
        if (StatusObrigacaoOcorrencia.isFinal(oo.getStatus())) {
            return false;
        }
        String nome = oo.getClienteObrigacao().getObrigacao().getNome();
        if (nome == null) return false;
        String n = nome.toUpperCase(Locale.ROOT);
        return n.contains("DAS") || n.contains("PGDAS");
    }
}
