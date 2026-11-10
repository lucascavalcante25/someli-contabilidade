package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Tag;
import br.com.someli.dto.UpdateClienteTagsRequestDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.TagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TagServiceTest {

    @Mock TagRepository tagRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock AuthorizationService authorizationService;
    @Mock TagSyncService tagSyncService;

    TagService service;

    @BeforeEach
    void setUp() {
        service = new TagService(tagRepository, clienteRepository, authorizationService, tagSyncService);
    }

    @Test
    void substituirTags_semPermissaoEditar_nega() {
        doThrow(new AcessoNegadoException("negado"))
                .when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_EDITAR);

        UpdateClienteTagsRequestDTO req = new UpdateClienteTagsRequestDTO();
        req.setTagIds(List.of(1L));

        assertThrows(AcessoNegadoException.class, () -> service.substituirTagsDoCliente(1L, req));
        verify(clienteRepository, never()).save(any());
    }

    @Test
    void substituirTags_ignoraAutomaticasEResync() {
        doNothing().when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        doNothing().when(authorizationService).requireCompanyAccess(1L);

        Cliente c = new Cliente();
        c.setId(1L);
        c.setTags(new HashSet<>());
        when(clienteRepository.findByIdWithResponsavel(1L)).thenReturn(Optional.of(c));

        Tag mei = new Tag();
        mei.setId(10L);
        mei.setNome("MEI");
        mei.setAutomatica(false);

        Tag inad = new Tag();
        inad.setId(11L);
        inad.setNome("INADIMPLENTE");
        inad.setAutomatica(true);
        inad.setRegra("INADIMPLENTE");

        when(tagRepository.findById(10L)).thenReturn(Optional.of(mei));
        when(tagRepository.findById(11L)).thenReturn(Optional.of(inad));
        when(clienteRepository.save(any(Cliente.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tagSyncService.sincronizarCliente(1L)).thenReturn(true);

        // Após sync, cliente fica com MEI + INAD (automática reaplicada)
        Cliente apos = new Cliente();
        apos.setId(1L);
        apos.setTags(new HashSet<>(Set.of(mei, inad)));
        when(clienteRepository.findByIdWithResponsavel(1L))
                .thenReturn(Optional.of(c))
                .thenReturn(Optional.of(apos));

        UpdateClienteTagsRequestDTO req = new UpdateClienteTagsRequestDTO();
        req.setTagIds(List.of(10L, 11L)); // 11 automática deve ser ignorada no save manual

        var result = service.substituirTagsDoCliente(1L, req);
        assertEquals(1, c.getTags().size());
        assertTrue(c.getTags().contains(mei));
        verify(tagSyncService).sincronizarCliente(1L);
        assertEquals(2, result.size());
    }

    private static Tag tag(long id, String nome) {
        Tag t = new Tag();
        t.setId(id);
        t.setNome(nome);
        t.setAutomatica(false);
        return t;
    }

    @Test
    void definirSegmento_semPermissaoEditar_nega() {
        doThrow(new AcessoNegadoException("negado"))
                .when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_EDITAR);

        assertThrows(AcessoNegadoException.class, () -> service.definirSegmento(1L, "SERVICOS"));
        verify(clienteRepository, never()).save(any());
    }

    @Test
    void definirSegmento_semAlcadaNoCliente_nega() {
        doThrow(new AcessoNegadoException("fora da alçada"))
                .when(authorizationService).requireCompanyAccess(1L);

        assertThrows(AcessoNegadoException.class, () -> service.definirSegmento(1L, "SERVICOS"));
        verify(clienteRepository, never()).save(any());
    }

    @Test
    void definirSegmento_valorDesconhecido_recusa() {
        assertThrows(br.com.someli.exception.RegraNegocioException.class, () -> service.definirSegmento(1L, "VAREJO"));
        verify(clienteRepository, never()).save(any());
    }

    @Test
    void definirSegmento_trocaSoATagDeSegmento_eMantemAsOutras() {
        Tag mei = tag(10L, "MEI");
        Tag comercio = tag(20L, "COMERCIO_INDUSTRIA");
        Tag servicos = tag(21L, "SERVICOS");
        Cliente c = new Cliente();
        c.setId(1L);
        c.setTags(new HashSet<>(Set.of(mei, comercio)));
        when(clienteRepository.findByIdWithResponsavel(1L)).thenReturn(Optional.of(c));
        when(tagRepository.findByNome("SERVICOS")).thenReturn(Optional.of(servicos));
        when(clienteRepository.save(any(Cliente.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = service.definirSegmento(1L, "SERVICOS");

        assertEquals(Set.of(mei, servicos), c.getTags());
        assertEquals(2, result.size());
        verify(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        verify(authorizationService).requireCompanyAccess(1L);
    }

    @Test
    void definirSegmento_criaATagQuandoAindaNaoExiste() {
        Cliente c = new Cliente();
        c.setId(1L);
        c.setTags(new HashSet<>());
        when(clienteRepository.findByIdWithResponsavel(1L)).thenReturn(Optional.of(c));
        when(tagRepository.findByNome("COMERCIO_INDUSTRIA")).thenReturn(Optional.empty());
        when(tagRepository.save(any(Tag.class))).thenAnswer(inv -> {
            Tag t = inv.getArgument(0);
            t.setId(30L);
            return t;
        });
        when(clienteRepository.save(any(Cliente.class))).thenAnswer(inv -> inv.getArgument(0));

        service.definirSegmento(1L, "COMERCIO_INDUSTRIA");

        assertEquals(1, c.getTags().size());
        Tag criada = c.getTags().iterator().next();
        assertEquals("COMERCIO_INDUSTRIA", criada.getNome());
        assertFalse(criada.getAutomatica());
    }

    @Test
    void listarPorCliente_inexistente_404() {
        doNothing().when(authorizationService).requireCompanyAccess(99L);
        doNothing().when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        when(clienteRepository.findByIdWithResponsavel(99L)).thenReturn(Optional.empty());

        assertThrows(ClienteNaoEncontradoException.class, () -> service.listarPorCliente(99L));
        verify(tagSyncService, never()).sincronizarCliente(anyLong());
    }
}
