package br.com.someli.service;

import br.com.someli.domain.ObrigacaoOcorrencia;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.SetorResponsabilidade;
import br.com.someli.domain.StatusObrigacaoOcorrencia;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.MeuTrabalhoDTO;
import br.com.someli.dto.ObrigacaoOcorrenciaDTO;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.NotificationRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaRepository;
import br.com.someli.mapper.ObrigacaoOcorrenciaMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MeuTrabalhoService {

    private final ObrigacaoOcorrenciaRepository ocorrenciaRepository;
    private final NotificationRepository notificationRepository;
    private final ClienteResponsavelRepository clienteResponsavelRepository;
    private final ClienteRepository clienteRepository;
    private final AuthorizationService authorizationService;

    public MeuTrabalhoService(ObrigacaoOcorrenciaRepository ocorrenciaRepository,
                              NotificationRepository notificationRepository,
                              ClienteResponsavelRepository clienteResponsavelRepository,
                              ClienteRepository clienteRepository,
                              AuthorizationService authorizationService) {
        this.ocorrenciaRepository = ocorrenciaRepository;
        this.notificationRepository = notificationRepository;
        this.clienteResponsavelRepository = clienteResponsavelRepository;
        this.clienteRepository = clienteRepository;
        this.authorizationService = authorizationService;
    }

    @Transactional(readOnly = true)
    public MeuTrabalhoDTO obter() {
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
        long aguardando = abertas.stream()
                .filter(oo -> StatusObrigacaoOcorrencia.AGUARDANDO_CLIENTE.equals(oo.getStatus()))
                .count();

        long carteira = alcadaSet == null
                ? clienteRepository.count()
                : alcadaSet.size();

        MeuTrabalhoDTO dto = new MeuTrabalhoDTO();
        dto.setVencendoHoje(hojeList.size());
        dto.setVencendoProximosDias(proximas.size());
        dto.setAtrasadas(atrasadas.size());
        dto.setAguardandoCliente(aguardando);
        dto.setNotificacoesNaoLidas(notificationRepository.countByUsuarioIdAndLidaFalse(u.getId()));
        dto.setEmpresasNaCarteira(carteira);
        dto.setObrigacoesProximas(hojeList.stream().limit(24).map(this::toDto).collect(Collectors.toCollection(ArrayList::new)));
        dto.getObrigacoesProximas().addAll(proximas.stream().limit(24).map(this::toDto).toList());
        dto.setObrigacoesAtrasadas(atrasadas.stream().limit(24).map(this::toDto).toList());

        if (authorizationService.hasPermission(u, PermissaoCodigo.VISAO_GERENCIAL)
                || authorizationService.hasAlcadaGlobal(u)) {
            dto.setVisaoGerencial(montarVisaoGerencial());
        }
        return dto;
    }

    private MeuTrabalhoDTO.VisaoGerencialDTO montarVisaoGerencial() {
        String competencia = String.format("%04d-%02d", YearMonth.now().getYear(), YearMonth.now().getMonthValue());
        List<ObrigacaoOcorrencia> doMes = ocorrenciaRepository.findAll().stream()
                .filter(oo -> competencia.equals(oo.getCompetencia())
                        || (oo.getCompetencia() == null && YearMonth.from(oo.getDataVencimento()).equals(YearMonth.now())))
                .toList();

        MeuTrabalhoDTO.VisaoGerencialDTO vg = new MeuTrabalhoDTO.VisaoGerencialDTO();
        vg.setTotalMes(doMes.size());
        vg.setConcluidas(doMes.stream().filter(o -> StatusObrigacaoOcorrencia.isFinal(o.getStatus())).count());
        vg.setPendentes(doMes.stream().filter(o -> StatusObrigacaoOcorrencia.PENDENTE.equals(o.getStatus())
                || StatusObrigacaoOcorrencia.EM_ANDAMENTO.equals(o.getStatus())).count());
        vg.setAguardandoCliente(doMes.stream().filter(o -> StatusObrigacaoOcorrencia.AGUARDANDO_CLIENTE.equals(o.getStatus())).count());
        vg.setAtrasadas(doMes.stream().filter(o -> StatusObrigacaoOcorrencia.ATRASADA.equals(o.getStatus())
                || (o.getDataVencimento().isBefore(LocalDate.now()) && !StatusObrigacaoOcorrencia.isFinal(o.getStatus()))).count());

        Map<String, long[]> porSetor = new HashMap<>();
        for (ObrigacaoOcorrencia oo : doMes) {
            String setor = oo.getClienteObrigacao() != null ? oo.getClienteObrigacao().resolverSetor() : "OUTROS";
            long[] arr = porSetor.computeIfAbsent(setor, k -> new long[2]);
            arr[0]++;
            if (StatusObrigacaoOcorrencia.isFinal(oo.getStatus())) arr[1]++;
        }
        List<MeuTrabalhoDTO.SetorPctDTO> setores = new ArrayList<>();
        for (Map.Entry<String, long[]> e : porSetor.entrySet()) {
            MeuTrabalhoDTO.SetorPctDTO s = new MeuTrabalhoDTO.SetorPctDTO();
            s.setSetor(e.getKey());
            s.setLabel(SetorResponsabilidade.label(e.getKey()));
            s.setTotal(e.getValue()[0]);
            s.setConcluidas(e.getValue()[1]);
            s.setPercentual(e.getValue()[0] == 0 ? 0 : Math.round(1000.0 * e.getValue()[1] / e.getValue()[0]) / 10.0);
            setores.add(s);
        }
        vg.setPorSetor(setores);

        long semResp = clienteRepository.findAll().stream()
                .filter(c -> Boolean.TRUE.equals(c.getAtivo()))
                .filter(c -> clienteResponsavelRepository.findAtivosByClienteId(c.getId()).isEmpty())
                .count();
        vg.setClientesSemResponsavel(semResp);
        return vg;
    }

    private ObrigacaoOcorrenciaDTO toDto(ObrigacaoOcorrencia oo) {
        return ObrigacaoOcorrenciaMapper.toDto(oo);
    }
}
