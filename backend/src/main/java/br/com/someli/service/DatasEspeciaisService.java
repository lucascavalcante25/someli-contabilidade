package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteResponsavel;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Profissao;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.DataEspecialDTO;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.ProfissaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Calendário de datas especiais dos clientes (pedido da Patrícia): aniversário do dono,
 * aniversário da empresa e dia da profissão. Mostra só clientes ativos dentro da alçada.
 */
@Service
public class DatasEspeciaisService {

    public static final String ANIVERSARIO_RESPONSAVEL = "ANIVERSARIO_RESPONSAVEL";
    public static final String ANIVERSARIO_EMPRESA = "ANIVERSARIO_EMPRESA";
    public static final String DIA_PROFISSAO = "DIA_PROFISSAO";

    private final ClienteRepository clienteRepository;
    private final ProfissaoRepository profissaoRepository;
    private final ClienteResponsavelRepository clienteResponsavelRepository;
    private final NotificationService notificationService;
    private final AuthorizationService authorizationService;

    public DatasEspeciaisService(ClienteRepository clienteRepository,
                                 ProfissaoRepository profissaoRepository,
                                 ClienteResponsavelRepository clienteResponsavelRepository,
                                 NotificationService notificationService,
                                 AuthorizationService authorizationService) {
        this.clienteRepository = clienteRepository;
        this.profissaoRepository = profissaoRepository;
        this.clienteResponsavelRepository = clienteResponsavelRepository;
        this.notificationService = notificationService;
        this.authorizationService = authorizationService;
    }

    /** Eventos do mês, em ordem de data, para o calendário do Dashboard. */
    @Transactional(readOnly = true)
    public List<DataEspecialDTO> eventosDoMes(int ano, int mes) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        if (mes < 1 || mes > 12 || ano < 1900 || ano > 2200) {
            throw new RegraNegocioException("Mês ou ano inválido");
        }
        Usuario u = authorizationService.currentUser();
        List<Long> alcada = authorizationService.clienteIdsNaAlcada(u);
        Set<Long> alcadaSet = alcada == null ? null : new HashSet<>(alcada);
        List<Cliente> clientes = clienteRepository.findAllWithResponsavel().stream()
                .filter(c -> Boolean.TRUE.equals(c.getAtivo()))
                .filter(c -> alcadaSet == null || alcadaSet.contains(c.getId()))
                .toList();
        return eventos(clientes, YearMonth.of(ano, mes));
    }

    /**
     * Avisa no sino, no próprio dia, quem cuida do cliente (gerente da conta e responsáveis por setor).
     * Roda pelo agendador, sem usuário logado; a chave evita aviso repetido no mesmo dia.
     */
    @Transactional
    public int notificarDia(LocalDate dia) {
        List<Cliente> ativos = clienteRepository.findAllWithResponsavel().stream()
                .filter(c -> Boolean.TRUE.equals(c.getAtivo()))
                .toList();
        Map<Long, Cliente> porId = ativos.stream().collect(Collectors.toMap(Cliente::getId, Function.identity(), (a, b) -> a));
        int criadas = 0;
        for (DataEspecialDTO e : eventos(ativos, YearMonth.from(dia))) {
            if (!dia.equals(e.getData())) continue;
            Cliente c = porId.get(e.getClienteId());
            for (Usuario dest : destinatarios(c)) {
                String chave = "DATA:" + e.getTipo() + ":" + c.getId() + ":" + dest.getId() + ":" + dia;
                if (notificationService.criarSeNaoExiste(dest, null, titulo(e), descricao(e), "normal",
                        "DATA_ESPECIAL", chave, "/clientes/" + c.getId()) != null) {
                    criadas++;
                }
            }
        }
        return criadas;
    }

    private List<DataEspecialDTO> eventos(List<Cliente> clientes, YearMonth mes) {
        Map<Long, Profissao> profissoes = profissaoRepository.findAll().stream()
                .filter(p -> !Boolean.FALSE.equals(p.getAtivo()))
                .collect(Collectors.toMap(Profissao::getId, Function.identity(), (a, b) -> a));
        List<DataEspecialDTO> lista = new ArrayList<>();
        for (Cliente c : clientes) {
            LocalDate nasc = c.getDataNascimentoResponsavel();
            if (nasc != null && nasc.getMonthValue() == mes.getMonthValue()) {
                DataEspecialDTO e = base(c, ANIVERSARIO_RESPONSAVEL, diaNoMes(mes, nasc.getDayOfMonth()));
                lista.add(e);
            }
            LocalDate abertura = c.getDataAbertura();
            if (abertura != null && abertura.getMonthValue() == mes.getMonthValue() && abertura.getYear() < mes.getYear()) {
                DataEspecialDTO e = base(c, ANIVERSARIO_EMPRESA, diaNoMes(mes, abertura.getDayOfMonth()));
                e.setAnos(mes.getYear() - abertura.getYear());
                lista.add(e);
            }
            Profissao p = c.getProfissaoId() == null ? null : profissoes.get(c.getProfissaoId());
            if (p != null && p.getMes() == mes.getMonthValue()) {
                DataEspecialDTO e = base(c, DIA_PROFISSAO, diaNoMes(mes, p.getDia()));
                e.setProfissao(p.getNome());
                lista.add(e);
            }
        }
        lista.sort(Comparator.comparing(DataEspecialDTO::getData)
                .thenComparing(DataEspecialDTO::getTipo)
                .thenComparing(DataEspecialDTO::getClienteNome, String.CASE_INSENSITIVE_ORDER));
        return lista;
    }

    /** 29/02 em ano não bissexto cai em 28/02. */
    private static LocalDate diaNoMes(YearMonth mes, int dia) {
        return mes.atDay(Math.min(dia, mes.lengthOfMonth()));
    }

    private static DataEspecialDTO base(Cliente c, String tipo, LocalDate data) {
        DataEspecialDTO e = new DataEspecialDTO();
        e.setData(data);
        e.setTipo(tipo);
        e.setClienteId(c.getId());
        String fantasia = c.getNomeFantasia();
        e.setClienteNome(fantasia != null && !fantasia.isBlank() ? fantasia : c.getRazaoSocial());
        e.setPessoa(c.getProprietario());
        e.setTelefone(c.getTelefone());
        return e;
    }

    private Set<Usuario> destinatarios(Cliente c) {
        Set<Usuario> dest = new LinkedHashSet<>();
        if (c.getResponsavel() != null && Boolean.TRUE.equals(c.getResponsavel().getAtivo())) {
            dest.add(c.getResponsavel());
        }
        for (ClienteResponsavel cr : clienteResponsavelRepository.findAtivosByClienteId(c.getId())) {
            if (cr.getUsuario() != null && Boolean.TRUE.equals(cr.getUsuario().getAtivo())) {
                dest.add(cr.getUsuario());
            }
        }
        return dest;
    }

    private static String titulo(DataEspecialDTO e) {
        String pessoa = e.getPessoa() != null && !e.getPessoa().isBlank() ? e.getPessoa() : e.getClienteNome();
        return switch (e.getTipo()) {
            case ANIVERSARIO_RESPONSAVEL -> "Aniversário: " + pessoa + " (" + e.getClienteNome() + ")";
            case ANIVERSARIO_EMPRESA -> "Aniversário da empresa: " + e.getClienteNome();
            default -> "Dia do " + e.getProfissao() + ": " + e.getClienteNome();
        };
    }

    private static String descricao(DataEspecialDTO e) {
        return switch (e.getTipo()) {
            case ANIVERSARIO_RESPONSAVEL -> "Hoje é aniversário do responsável pela " + e.getClienteNome() + ". Que tal mandar os parabéns?";
            case ANIVERSARIO_EMPRESA -> "A " + e.getClienteNome() + " completa " + e.getAnos() + " ano(s) hoje.";
            default -> "Hoje é o Dia do " + e.getProfissao() + ". Lembre de parabenizar a " + e.getClienteNome() + ".";
        };
    }
}
