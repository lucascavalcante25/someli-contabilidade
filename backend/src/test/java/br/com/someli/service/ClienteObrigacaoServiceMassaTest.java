package br.com.someli.service;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.AplicarObrigacoesEmMassaRequestDTO;
import br.com.someli.dto.CreateClienteObrigacaoRequestDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ObrigacaoRepository;
import br.com.someli.repository.UsuarioRepository;
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

/**
 * TDD — aplicação em massa: nega sem permissão; pula cliente sem alçada / já vinculado.
 */
@ExtendWith(MockitoExtension.class)
class ClienteObrigacaoServiceMassaTest {

    @Mock ClienteObrigacaoRepository clienteObrigacaoRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock ObrigacaoRepository obrigacaoRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock AuthorizationService authorizationService;
    @Mock ObrigacaoOcorrenciaService ocorrenciaService;

    ClienteObrigacaoService service;

    @BeforeEach
    void setUp() {
        service = new ClienteObrigacaoService(
                clienteObrigacaoRepository, clienteRepository, obrigacaoRepository,
                usuarioRepository, authorizationService, ocorrenciaService);
    }

    @Test
    void aplicarEmMassa_semPermissao_nega() {
        doThrow(new AcessoNegadoException("negado"))
                .when(authorizationService).requirePermission(PermissaoCodigo.OBRIGACOES_CRIAR);

        AplicarObrigacoesEmMassaRequestDTO req = new AplicarObrigacoesEmMassaRequestDTO();
        req.setClienteIds(List.of(1L));
        req.setObrigacaoId(10L);
        req.setDataVencimento(LocalDate.of(2026, 9, 20));

        assertThrows(AcessoNegadoException.class, () -> service.aplicarEmMassa(req));
    }

    @Test
    void aplicarEmMassa_pulaJaVinculadoESemAlcada() {
        doNothing().when(authorizationService).requirePermission(PermissaoCodigo.OBRIGACOES_CRIAR);
        when(authorizationService.currentUser()).thenReturn(null);
        when(authorizationService.canAccessCompany(isNull(), eq(1L))).thenReturn(true);
        when(authorizationService.canAccessCompany(isNull(), eq(2L))).thenReturn(false);
        when(clienteObrigacaoRepository.existsByClienteIdAndObrigacaoIdAndAtivoTrue(1L, 10L)).thenReturn(true);

        AplicarObrigacoesEmMassaRequestDTO req = new AplicarObrigacoesEmMassaRequestDTO();
        req.setClienteIds(List.of(1L, 2L));
        req.setObrigacaoId(10L);
        req.setDataVencimento(LocalDate.of(2026, 9, 20));

        assertEquals(0, service.aplicarEmMassa(req));
        verify(clienteRepository, never()).findById(any());
    }
}
