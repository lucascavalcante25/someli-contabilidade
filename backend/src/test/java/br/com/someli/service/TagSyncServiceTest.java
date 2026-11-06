package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.Tag;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.TagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TagSyncServiceTest {

    @Mock TagRepository tagRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock ClienteService clienteService;

    TagSyncService service;
    Tag tagNovo;
    Tag tagInad;
    Tag tagMei;

    @BeforeEach
    void setUp() {
        service = new TagSyncService(tagRepository, clienteRepository, clienteService, 90, 3);
        tagNovo = tag("NOVO_CLIENTE", true, "NOVO_CLIENTE");
        tagInad = tag("INADIMPLENTE", true, "INADIMPLENTE");
        tagMei = tag("MEI", false, null);
    }

    @Test
    void novoCliente_someAposJanela() {
        Cliente c = baseCliente();
        c.setDataInicioCobranca(LocalDate.now().minusDays(120));
        c.setTags(new HashSet<>(Set.of(tagNovo, tagMei)));

        when(tagRepository.findByNome("NOVO_CLIENTE")).thenReturn(Optional.of(tagNovo));
        when(tagRepository.findByNome("INADIMPLENTE")).thenReturn(Optional.of(tagInad));
        when(clienteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        boolean mudou = service.aplicarRegras(c, 0, LocalDate.now());
        assertTrue(mudou);
        assertFalse(c.getTags().contains(tagNovo));
        assertTrue(c.getTags().contains(tagMei));
        assertFalse(c.getTags().contains(tagInad));
    }

    @Test
    void inadimplente_apareceComAtrasoESomeAoQuitar() {
        Cliente c = baseCliente();
        c.setDataInicioCobranca(LocalDate.now().minusDays(200));
        c.setStatus("atrasado");
        c.setTags(new HashSet<>(Set.of(tagMei)));

        when(tagRepository.findByNome("NOVO_CLIENTE")).thenReturn(Optional.of(tagNovo));
        when(tagRepository.findByNome("INADIMPLENTE")).thenReturn(Optional.of(tagInad));
        when(clienteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertTrue(service.aplicarRegras(c, 3, LocalDate.now()));
        assertTrue(c.getTags().contains(tagInad));
        assertTrue(c.getTags().contains(tagMei));

        c.setStatus("em_dia");
        assertTrue(service.aplicarRegras(c, 0, LocalDate.now()));
        assertFalse(c.getTags().contains(tagInad));
        assertTrue(c.getTags().contains(tagMei));
    }

    @Test
    void inadimplente_soComTresMesesSeguidosEmAberto() {
        Cliente c = baseCliente();
        c.setDataInicioCobranca(LocalDate.now().minusDays(200));
        c.setStatus("atrasado");
        when(tagRepository.findByNome("NOVO_CLIENTE")).thenReturn(Optional.of(tagNovo));
        when(tagRepository.findByNome("INADIMPLENTE")).thenReturn(Optional.of(tagInad));

        assertFalse(service.aplicarRegras(c, 2, LocalDate.now()));
        assertFalse(c.getTags().contains(tagInad));
        verify(clienteRepository, never()).save(any());
    }

    @Test
    void maiorSequencia_contaMesesSeguidosInclusiveNaViradaDoAno() {
        assertEquals(2, ClienteService.maiorSequenciaMesesSeguidos(java.util.List.of(
                YearMonth.of(2026, 6), YearMonth.of(2026, 8), YearMonth.of(2026, 9))));
        assertEquals(3, ClienteService.maiorSequenciaMesesSeguidos(java.util.List.of(
                YearMonth.of(2026, 11), YearMonth.of(2026, 12), YearMonth.of(2027, 1))));
        assertEquals(0, ClienteService.maiorSequenciaMesesSeguidos(java.util.List.of()));
    }

    @Test
    void tagDeRegime_segueORegimeDoCadastro() {
        Tag simples = tag("SIMPLES_NACIONAL", true, "REGIME");
        Tag presumido = tag("LUCRO_PRESUMIDO", true, "REGIME");
        Tag urgente = tag("URGENTE", false, null);
        Cliente c = baseCliente();
        c.setDataInicioCobranca(LocalDate.now().minusYears(1));
        c.setRegimeTributario("SIMPLES_NACIONAL");
        c.setTags(new HashSet<>(Set.of(presumido, urgente)));
        lenient().when(tagRepository.findByNome("SIMPLES_NACIONAL")).thenReturn(Optional.of(simples));
        when(clienteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertTrue(service.aplicarRegras(c, 0, LocalDate.now()));

        assertEquals(Set.of(simples, urgente), c.getTags());
    }

    @Test
    void tagDeRegime_lucroReal() {
        Tag real = tag("LUCRO_REAL", true, "REGIME");
        Cliente c = baseCliente();
        c.setDataInicioCobranca(LocalDate.now().minusYears(1));
        c.setRegimeTributario("LUCRO_REAL");
        lenient().when(tagRepository.findByNome("LUCRO_REAL")).thenReturn(Optional.of(real));
        when(clienteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertTrue(service.aplicarRegras(c, 0, LocalDate.now()));
        assertTrue(c.getTags().contains(real));
    }

    @Test
    void meiManual_nuncaRemovidaPorTempo() {
        Cliente c = baseCliente();
        c.setDataInicioCobranca(LocalDate.now().minusYears(2));
        c.setTags(new HashSet<>(Set.of(tagMei)));
        when(tagRepository.findByNome("NOVO_CLIENTE")).thenReturn(Optional.of(tagNovo));
        when(tagRepository.findByNome("INADIMPLENTE")).thenReturn(Optional.of(tagInad));

        assertFalse(service.aplicarRegras(c, 0, LocalDate.now()));
        assertTrue(c.getTags().contains(tagMei));
        verify(clienteRepository, never()).save(any());
    }

    @Test
    void deveSerNovoCliente_usaInicioCobranca() {
        Cliente c = baseCliente();
        c.setDataInicioCobranca(LocalDate.now().minusDays(10));
        c.setDataCriacao(LocalDateTime.now().minusYears(1));
        assertTrue(service.deveSerNovoCliente(c, LocalDate.now()));
    }

    private Cliente baseCliente() {
        Cliente c = new Cliente();
        c.setId(1L);
        c.setRazaoSocial("Teste");
        c.setTags(new HashSet<>());
        return c;
    }

    private Tag tag(String nome, boolean auto, String regra) {
        Tag t = new Tag();
        t.setId((long) nome.hashCode());
        t.setNome(nome);
        t.setAutomatica(auto);
        t.setRegra(regra);
        return t;
    }
}
