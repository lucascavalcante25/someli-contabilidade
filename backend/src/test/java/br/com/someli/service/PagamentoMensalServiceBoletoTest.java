package br.com.someli.service;

import br.com.someli.domain.PagamentoMensal;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.BoletoEnviadoDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.PagamentoMensalRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PagamentoMensalServiceBoletoTest {

    @Mock private PagamentoMensalRepository pagamentoMensalRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private TagSyncService tagSyncService;
    @Mock private AuthorizationService authorizationService;

    private PagamentoMensalService service;

    @BeforeEach
    void setUp() {
        service = new PagamentoMensalService(pagamentoMensalRepository, clienteRepository, tagSyncService,
                authorizationService);
        Usuario karol = new Usuario();
        karol.setNome("Karol");
        lenient().when(authorizationService.currentUser()).thenReturn(karol);
        lenient().when(clienteRepository.existsById(7L)).thenReturn(true);
        lenient().when(pagamentoMensalRepository.save(any(PagamentoMensal.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void marcar_criaRegistroDoMesSemMarcarComoPago() {
        when(pagamentoMensalRepository.findByClienteIdAndMesAndAno(7L, 11, 2026)).thenReturn(Optional.empty());

        BoletoEnviadoDTO r = service.alterarBoletoEnviado(7L, 11, 2026, true);

        assertThat(r.enviado()).isTrue();
        assertThat(r.enviadoPor()).isEqualTo("Karol");
        assertThat(r.enviadoEm()).isNotNull();
        verify(pagamentoMensalRepository).save(org.mockito.ArgumentMatchers.argThat(pm ->
                Boolean.TRUE.equals(pm.getBoletoEnviado()) && Boolean.FALSE.equals(pm.getPago())
                        && Boolean.TRUE.equals(pm.getCobravel())));
        verify(authorizationService).requirePermission(PermissaoCodigo.FINANCEIRO_LANCAR);
        verify(authorizationService).requireCompanyAccess(7L);
    }

    @Test
    void desmarcar_limpaQuemEQuandoEPedePermissaoDeEditar() {
        PagamentoMensal pm = new PagamentoMensal();
        pm.setClienteId(7L);
        pm.setMes(11);
        pm.setAno(2026);
        pm.setBoletoEnviado(true);
        pm.setBoletoEnviadoPor("Karol");
        pm.setBoletoEnviadoEm(java.time.LocalDateTime.now());
        when(pagamentoMensalRepository.findByClienteIdAndMesAndAno(7L, 11, 2026)).thenReturn(Optional.of(pm));

        BoletoEnviadoDTO r = service.alterarBoletoEnviado(7L, 11, 2026, false);

        assertThat(r.enviado()).isFalse();
        assertThat(r.enviadoPor()).isNull();
        assertThat(r.enviadoEm()).isNull();
        verify(authorizationService).requirePermission(PermissaoCodigo.FINANCEIRO_EDITAR);
    }

    @Test
    void semAlcada_naoGrava() {
        doThrow(new AcessoNegadoException("Sem alçada")).when(authorizationService).requireCompanyAccess(7L);

        assertThatThrownBy(() -> service.alterarBoletoEnviado(7L, 11, 2026, true))
                .isInstanceOf(AcessoNegadoException.class);
        verify(pagamentoMensalRepository, never()).save(any());
    }

    @Test
    void mesInvalido_recusa() {
        assertThatThrownBy(() -> service.alterarBoletoEnviado(7L, 13, 2026, true))
                .isInstanceOf(RegraNegocioException.class);
        verify(pagamentoMensalRepository, never()).save(any());
    }
}
