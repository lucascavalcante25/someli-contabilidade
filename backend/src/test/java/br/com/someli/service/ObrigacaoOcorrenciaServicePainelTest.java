package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.ObrigacaoOcorrencia;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaEventoRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Painel do mês: todas as ocorrências de uma competência, só das empresas e setores do usuário. */
@ExtendWith(MockitoExtension.class)
class ObrigacaoOcorrenciaServicePainelTest {

    @Mock ObrigacaoOcorrenciaRepository ocorrenciaRepository;
    @Mock ObrigacaoOcorrenciaEventoRepository eventoRepository;
    @Mock ClienteObrigacaoRepository clienteObrigacaoRepository;
    @Mock AuthorizationService authorizationService;
    @Mock AuditLogService auditLogService;
    @Mock DiaUtilService diaUtilService;

    ObrigacaoOcorrenciaService service;
    final Usuario ana = new Usuario();

    @BeforeEach
    void setUp() {
        service = new ObrigacaoOcorrenciaService(ocorrenciaRepository, eventoRepository, clienteObrigacaoRepository,
                authorizationService, auditLogService, diaUtilService);
    }

    private ObrigacaoOcorrencia ocorrencia(long clienteId, String setor) {
        Cliente c = new Cliente();
        c.setId(clienteId);
        ClienteObrigacao co = new ClienteObrigacao();
        co.setCliente(c);
        co.setSetor(setor);
        ObrigacaoOcorrencia oo = new ObrigacaoOcorrencia();
        oo.setClienteObrigacao(co);
        oo.setCompetencia("2026-10");
        return oo;
    }

    @Test
    void semPermissao_nega() {
        doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.OBRIGACOES_VISUALIZAR);

        assertThatThrownBy(() -> service.listarPorCompetencia("2026-10")).isInstanceOf(AcessoNegadoException.class);
        verify(ocorrenciaRepository, never()).findByCompetenciaWithDetails(anyString());
    }

    @Test
    void competenciaInvalida_recusa() {
        assertThatThrownBy(() -> service.listarPorCompetencia("10/2026")).isInstanceOf(RegraNegocioException.class);
    }

    @Test
    void alcadaGlobal_veTudo() {
        List<ObrigacaoOcorrencia> todas = List.of(ocorrencia(1L, "FISCAL"), ocorrencia(2L, "DEPARTAMENTO_PESSOAL"));
        when(ocorrenciaRepository.findByCompetenciaWithDetails("2026-10")).thenReturn(todas);
        when(authorizationService.currentUser()).thenReturn(ana);
        when(authorizationService.hasAlcadaGlobal(ana)).thenReturn(true);

        assertThat(service.listarPorCompetencia("2026-10")).hasSize(2);
    }

    @Test
    void semAlcadaGlobal_soVeEmpresaESetorQuePode() {
        ObrigacaoOcorrencia fiscalCliente1 = ocorrencia(1L, "FISCAL");
        ObrigacaoOcorrencia dpCliente1 = ocorrencia(1L, "DEPARTAMENTO_PESSOAL");
        ObrigacaoOcorrencia fiscalCliente2 = ocorrencia(2L, "FISCAL");
        when(ocorrenciaRepository.findByCompetenciaWithDetails("2026-10"))
                .thenReturn(List.of(fiscalCliente1, dpCliente1, fiscalCliente2));
        when(authorizationService.currentUser()).thenReturn(ana);
        when(authorizationService.hasAlcadaGlobal(ana)).thenReturn(false);
        when(authorizationService.canAccessDepartment(ana, 1L, "FISCAL")).thenReturn(true);
        when(authorizationService.canAccessDepartment(ana, 1L, "DEPARTAMENTO_PESSOAL")).thenReturn(false);
        when(authorizationService.canAccessDepartment(ana, 2L, "FISCAL")).thenReturn(false);

        assertThat(service.listarPorCompetencia("2026-10")).containsExactly(fiscalCliente1);
    }
}
