package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.Obrigacao;
import br.com.someli.domain.ObrigacaoOcorrencia;
import br.com.someli.domain.Perfil;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.NotificationRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeuTrabalhoServiceTest {

    @Mock ObrigacaoOcorrenciaRepository ocorrenciaRepository;
    @Mock NotificationRepository notificationRepository;
    @Mock ClienteResponsavelRepository clienteResponsavelRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock AuthorizationService authorizationService;

    MeuTrabalhoService service;

    @BeforeEach
    void setUp() {
        service = new MeuTrabalhoService(
                ocorrenciaRepository, notificationRepository,
                clienteResponsavelRepository, clienteRepository, authorizationService);
    }

    private ObrigacaoOcorrencia ocorrencia(long id, long clienteId, String setor, LocalDate venc) {
        Cliente c = new Cliente();
        c.setId(clienteId);
        c.setRazaoSocial("Cliente " + clienteId);
        Obrigacao ob = new Obrigacao();
        ob.setId(id);
        ob.setNome("eSocial");
        ClienteObrigacao co = new ClienteObrigacao();
        co.setId(id);
        co.setCliente(c);
        co.setObrigacao(ob);
        co.setSetor(setor);
        ObrigacaoOcorrencia oo = new ObrigacaoOcorrencia();
        oo.setId(id);
        oo.setClienteObrigacao(co);
        oo.setDataVencimento(venc);
        oo.setStatus("PENDENTE");
        return oo;
    }

    @Test
    void adminComAlcadaGlobal_veObrigacoesDeTodosOsSetores() {
        Usuario admin = new Usuario();
        admin.setId(1L);
        admin.setPerfil(Perfil.ADMIN);
        when(authorizationService.currentUser()).thenReturn(admin);
        doNothing().when(authorizationService).requirePermission(PermissaoCodigo.DASHBOARD_VISUALIZAR);
        when(authorizationService.clienteIdsNaAlcada(admin)).thenReturn(null); // global
        when(authorizationService.hasAlcadaGlobal(admin)).thenReturn(true);
        when(authorizationService.hasPermission(admin, PermissaoCodigo.VISAO_GERENCIAL)).thenReturn(true);
        when(notificationRepository.countByUsuarioIdAndLidaFalse(1L)).thenReturn(0L);
        when(clienteRepository.count()).thenReturn(8L);

        LocalDate hoje = LocalDate.now();
        when(ocorrenciaRepository.findAbertasComVencimentoAte(any()))
                .thenReturn(List.of(
                        ocorrencia(1, 10, "FISCAL", hoje.plusDays(2)),
                        ocorrencia(2, 11, "DEPARTAMENTO_PESSOAL", hoje.plusDays(3))
                ));
        when(ocorrenciaRepository.findAll()).thenReturn(List.of());
        when(clienteRepository.findAll()).thenReturn(List.of());

        var dto = service.obter();
        assertEquals(2, dto.getObrigacoesProximas().size());
        assertTrue(dto.getObrigacoesProximas().stream().anyMatch(o -> "FISCAL".equals(o.getSetor())));
        assertTrue(dto.getObrigacoesProximas().stream().anyMatch(o -> "DEPARTAMENTO_PESSOAL".equals(o.getSetor())));
    }

    @Test
    void operador_soVeSetorDaSuaAlcada() {
        Usuario op = new Usuario();
        op.setId(5L);
        op.setPerfil(Perfil.OPERADOR);
        when(authorizationService.currentUser()).thenReturn(op);
        doNothing().when(authorizationService).requirePermission(PermissaoCodigo.DASHBOARD_VISUALIZAR);
        when(authorizationService.clienteIdsNaAlcada(op)).thenReturn(List.of(10L));
        when(authorizationService.hasAlcadaGlobal(op)).thenReturn(false);
        when(authorizationService.canAccessDepartment(eq(op), eq(10L), eq("FISCAL"))).thenReturn(true);
        when(authorizationService.canAccessDepartment(eq(op), eq(10L), eq("DEPARTAMENTO_PESSOAL"))).thenReturn(false);
        when(authorizationService.hasPermission(op, PermissaoCodigo.VISAO_GERENCIAL)).thenReturn(false);
        when(notificationRepository.countByUsuarioIdAndLidaFalse(5L)).thenReturn(0L);

        LocalDate hoje = LocalDate.now();
        when(ocorrenciaRepository.findAbertasComVencimentoAte(any()))
                .thenReturn(List.of(
                        ocorrencia(1, 10, "FISCAL", hoje.plusDays(2)),
                        ocorrencia(2, 10, "DEPARTAMENTO_PESSOAL", hoje.plusDays(3)),
                        ocorrencia(3, 99, "FISCAL", hoje.plusDays(2)) // fora da carteira
                ));

        var dto = service.obter();
        assertEquals(1, dto.getObrigacoesProximas().size());
        assertEquals("FISCAL", dto.getObrigacoesProximas().get(0).getSetor());
        assertNull(dto.getVisaoGerencial());
    }
}
