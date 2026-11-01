package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.Tag;
import br.com.someli.domain.TagRegra;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.TagRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Sincroniza tags operacionais derivadas de estado (NOVO_CLIENTE, INADIMPLENTE).
 * Tags manuais (MEI, URGENTE, regimes…) não são alteradas.
 */
@Service
public class TagSyncService {

    private static final Logger log = LoggerFactory.getLogger(TagSyncService.class);

    private final TagRepository tagRepository;
    private final ClienteRepository clienteRepository;
    private final ClienteService clienteService;

    private final int novoClienteDias;
    private final int novoClienteCompetencias;

    public TagSyncService(TagRepository tagRepository,
                          ClienteRepository clienteRepository,
                          @Lazy ClienteService clienteService,
                          @Value("${app.tags.novo-cliente-dias:90}") int novoClienteDias,
                          @Value("${app.tags.novo-cliente-competencias:3}") int novoClienteCompetencias) {
        this.tagRepository = tagRepository;
        this.clienteRepository = clienteRepository;
        this.clienteService = clienteService;
        this.novoClienteDias = Math.max(novoClienteDias, 0);
        this.novoClienteCompetencias = Math.max(novoClienteCompetencias, 0);
    }

    @Transactional
    public int sincronizarTodos() {
        List<Cliente> clientes = clienteRepository.findAllWithResponsavel();
        YearMonth atual = YearMonth.now();
        LocalDate hoje = LocalDate.now();
        Map<Long, Set<YearMonth>> pagos = clienteService.indexarPagamentosPagos();
        Map<Long, Set<YearMonth>> naoCobraveis = clienteService.indexarMesesNaoCobraveis();

        int alterados = 0;
        for (Cliente c : clientes) {
            clienteService.enriquecerStatusPagamento(
                    c, atual, hoje,
                    pagos.getOrDefault(c.getId(), Set.of()),
                    naoCobraveis.getOrDefault(c.getId(), Set.of()));
            if (aplicarRegras(c, c.getMesesPendentes() != null ? c.getMesesPendentes() : 0, hoje)) {
                alterados++;
            }
        }
        log.info("Tags inteligentes sincronizadas: {} clientes alterados de {}", alterados, clientes.size());
        return alterados;
    }

    @Transactional
    public boolean sincronizarCliente(Long clienteId) {
        Cliente c = clienteRepository.findByIdWithResponsavel(clienteId).orElse(null);
        if (c == null) return false;
        YearMonth atual = YearMonth.now();
        LocalDate hoje = LocalDate.now();
        Map<Long, Set<YearMonth>> pagos = clienteService.indexarPagamentosPagos();
        Map<Long, Set<YearMonth>> naoCobraveis = clienteService.indexarMesesNaoCobraveis();
        clienteService.enriquecerStatusPagamento(
                c, atual, hoje,
                pagos.getOrDefault(clienteId, Set.of()),
                naoCobraveis.getOrDefault(clienteId, Set.of()));
        return aplicarRegras(c, c.getMesesPendentes() != null ? c.getMesesPendentes() : 0, hoje);
    }

    /**
     * Aplica regras de tags automáticas preservando tags manuais.
     * @return true se o conjunto de tags mudou
     */
    @Transactional
    public boolean aplicarRegras(Cliente cliente, int mesesPendentes, LocalDate hoje) {
        if (cliente == null || cliente.getId() == null) return false;

        Optional<Tag> tagNovo = tagRepository.findByNome("NOVO_CLIENTE");
        Optional<Tag> tagInad = tagRepository.findByNome("INADIMPLENTE");

        Set<Tag> atuais = cliente.getTags() != null ? new HashSet<>(cliente.getTags()) : new HashSet<>();
        Set<Tag> proximas = atuais.stream()
                .filter(t -> !Boolean.TRUE.equals(t.getAutomatica()))
                .collect(Collectors.toCollection(HashSet::new));

        boolean querNovo = deveSerNovoCliente(cliente, hoje);
        boolean querInad = mesesPendentes > 0 || "atrasado".equalsIgnoreCase(cliente.getStatus());

        if (querNovo) {
            tagNovo.ifPresent(proximas::add);
        }
        if (querInad) {
            tagInad.ifPresent(proximas::add);
        }

        Set<Long> idsAntes = atuais.stream().map(Tag::getId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> idsDepois = proximas.stream().map(Tag::getId).filter(Objects::nonNull).collect(Collectors.toSet());
        if (idsAntes.equals(idsDepois)) {
            return false;
        }
        cliente.setTags(proximas);
        clienteRepository.save(cliente);
        return true;
    }

    /**
     * NOVO_CLIENTE: true enquanto estiver dentro da janela configurável.
     * Preferência: data_inicio_cobranca; fallback data_criacao.
     * Sai após {@code novoClienteDias} OU após {@code novoClienteCompetencias} competências
     * (o que ocorrer primeiro; competências=0 desliga essa parte).
     */
    boolean deveSerNovoCliente(Cliente c, LocalDate hoje) {
        LocalDate referencia = c.getDataInicioCobranca() != null
                ? c.getDataInicioCobranca()
                : (c.getDataCriacao() != null ? c.getDataCriacao().toLocalDate() : null);
        if (referencia == null) {
            return false;
        }
        if (hoje.isBefore(referencia)) {
            return true; // cobrança ainda não começou → ainda "novo"
        }
        long dias = ChronoUnit.DAYS.between(referencia, hoje);
        boolean dentroDias = novoClienteDias <= 0 || dias < novoClienteDias;

        boolean dentroCompetencias = true;
        if (novoClienteCompetencias > 0) {
            YearMonth inicio = YearMonth.from(referencia);
            YearMonth atual = YearMonth.from(hoje);
            long comps = ChronoUnit.MONTHS.between(inicio, atual) + 1;
            dentroCompetencias = comps <= novoClienteCompetencias;
        }
        return dentroDias && dentroCompetencias;
    }

    /** Nomes das regras automáticas conhecidas (para UI / testes). */
    public static Set<String> regrasAutomaticas() {
        return Set.of(TagRegra.NOVO_CLIENTE, TagRegra.INADIMPLENTE);
    }
}
