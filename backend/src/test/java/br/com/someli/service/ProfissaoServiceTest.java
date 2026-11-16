package br.com.someli.service;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Profissao;
import br.com.someli.dto.ProfissaoRequestDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ProfissaoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Lista de profissões e datas: editável pelo escritório, sem depender de mudança no código. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProfissaoServiceTest {

    @Mock ProfissaoRepository repository;
    @Mock AuthorizationService authorizationService;
    @Mock AuditLogService auditLogService;
    ProfissaoService service;

    @BeforeEach
    void setUp() {
        service = new ProfissaoService(repository, authorizationService, auditLogService);
        when(repository.save(any())).thenAnswer(inv -> {
            Profissao p = inv.getArgument(0);
            if (p.getId() == null) p.setId(99L);
            return p;
        });
    }

    private static ProfissaoRequestDTO req(String nome, int dia, int mes) {
        ProfissaoRequestDTO r = new ProfissaoRequestDTO();
        r.setNome(nome);
        r.setDia(dia);
        r.setMes(mes);
        r.setCnaePrefixos(" 96.02-5 , 9602 ");
        return r;
    }

    @Test
    void listarExigeVerClientes_eTrazEmOrdemDeNome() {
        Profissao b = new Profissao();
        b.setId(1L); b.setNome("Nutricionista"); b.setDia(31); b.setMes(8); b.setAtivo(true);
        Profissao a = new Profissao();
        a.setId(2L); a.setNome("Dentista"); a.setDia(25); a.setMes(10); a.setAtivo(true);
        when(repository.findAll()).thenReturn(List.of(b, a));

        assertThat(service.listar()).extracting("nome").containsExactly("Dentista", "Nutricionista");
        verify(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
    }

    @Test
    void criarExigeEditarClientes() {
        doThrow(new AcessoNegadoException("Sem permissão")).when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        assertThatThrownBy(() -> service.criar(req("Barbeiro", 5, 9))).isInstanceOf(AcessoNegadoException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void criarLimpaOsPrefixosDeCnae() {
        var dto = service.criar(req("  Barbeiro ", 5, 9));
        assertThat(dto.nome()).isEqualTo("Barbeiro");
        assertThat(dto.cnaePrefixos()).isEqualTo("96025,9602");
    }

    @Test
    void dataQueNaoExiste_400() {
        assertThatThrownBy(() -> service.criar(req("Fantasma", 31, 4))).isInstanceOf(RegraNegocioException.class);
    }

    @Test
    void nomeRepetido_400() {
        Profissao existente = new Profissao();
        existente.setId(5L);
        when(repository.findByNomeIgnoreCase("barbeiro")).thenReturn(Optional.of(existente));
        assertThatThrownBy(() -> service.criar(req("barbeiro", 5, 9))).isInstanceOf(RegraNegocioException.class);
    }
}
