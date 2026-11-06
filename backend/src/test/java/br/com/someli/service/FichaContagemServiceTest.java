package br.com.someli.service;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.FichaItemSetor;
import br.com.someli.repository.ClienteAcessoRepository;
import br.com.someli.repository.ClienteAnotacaoRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FichaContagemServiceTest {

    @Mock private ClienteAcessoRepository acessoRepository;
    @Mock private ClienteAnotacaoRepository anotacaoRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private ClienteResponsavelRepository responsaveis;

    private FichaContagemService service;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        service = new FichaContagemService(acessoRepository, anotacaoRepository, authorizationService,
                new FichaSetorGuard(authorizationService, responsaveis));
        usuario = new Usuario();
        usuario.setId(3L);
    }

    @Test
    void semPermissao_naoContaNada() {
        when(authorizationService.hasPermission(PermissaoCodigo.CLIENTE_ACESSOS_VER)).thenReturn(false);
        when(authorizationService.hasPermission(PermissaoCodigo.CLIENTES_VISUALIZAR)).thenReturn(false);

        assertThat(service.contagens()).isEmpty();
    }

    @Test
    void contaSoOQueAAlcadaEnxerga_semTrazerSegredo() {
        when(authorizationService.hasPermission(PermissaoCodigo.CLIENTE_ACESSOS_VER)).thenReturn(true);
        when(authorizationService.hasPermission(PermissaoCodigo.CLIENTES_VISUALIZAR)).thenReturn(true);
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.hasAlcadaGlobal(usuario)).thenReturn(false);
        when(authorizationService.clienteIdsNaAlcada(usuario)).thenReturn(List.of(7L));
        when(responsaveis.findSetoresAtivos(7L, 3L)).thenReturn(List.of("FISCAL"));
        when(acessoRepository.listarSetoresAtivos()).thenReturn(List.of(
                new FichaItemSetor(7L, "FISCAL"),
                new FichaItemSetor(7L, "DEPARTAMENTO_PESSOAL"),
                new FichaItemSetor(8L, null)));
        when(anotacaoRepository.listarSetoresAtivos()).thenReturn(List.of(new FichaItemSetor(7L, null)));

        var lista = service.contagens();

        assertThat(lista).hasSize(1);
        assertThat(lista.get(0).clienteId()).isEqualTo(7L);
        assertThat(lista.get(0).acessos()).isEqualTo(1);
        assertThat(lista.get(0).anotacoes()).isEqualTo(1);
        assertThat(lista.get(0).toString()).doesNotContain("senha");
    }
}
