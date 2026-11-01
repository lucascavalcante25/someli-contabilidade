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

    @Test
    void listarPorCliente_inexistente_404() {
        doNothing().when(authorizationService).requireCompanyAccess(99L);
        doNothing().when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        when(clienteRepository.findByIdWithResponsavel(99L)).thenReturn(Optional.empty());

        assertThrows(ClienteNaoEncontradoException.class, () -> service.listarPorCliente(99L));
        verify(tagSyncService, never()).sincronizarCliente(anyLong());
    }
}
