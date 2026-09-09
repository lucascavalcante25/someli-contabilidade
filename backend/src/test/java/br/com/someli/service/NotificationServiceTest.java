package br.com.someli.service;

import br.com.someli.domain.Notification;
import br.com.someli.domain.Usuario;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.NotificationRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaRepository;
import br.com.someli.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * TDD — ciclo red/green: notificação não deve duplicar pela mesma chave_dedup.
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock NotificationRepository notificationRepository;
    @Mock ObrigacaoOcorrenciaRepository ocorrenciaRepository;
    @Mock ClienteResponsavelRepository clienteResponsavelRepository;
    @Mock AuthorizationService authorizationService;
    @Mock SecurityUtils securityUtils;

    NotificationService service;

    @BeforeEach
    void setUp() {
        service = new NotificationService(
                notificationRepository,
                ocorrenciaRepository,
                clienteResponsavelRepository,
                authorizationService,
                securityUtils
        );
    }

    @Test
    void criarSeNaoExiste_quandoChaveJaExiste_naoPersisteNovamente() {
        Usuario dest = new Usuario();
        dest.setId(2L);

        when(notificationRepository.existsByUsuarioIdAndChaveDedup(2L, "ocorrencia:99:alerta"))
                .thenReturn(true);

        Notification result = service.criarSeNaoExiste(
                dest, null, "DAS vence", "Empresa ABC", "alta",
                "OBRIGACAO_ALERTA", "ocorrencia:99:alerta", "/meu-trabalho"
        );

        assertNull(result);
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void criarSeNaoExiste_quandoChaveNova_persisteComDedupELink() {
        Usuario dest = new Usuario();
        dest.setId(2L);

        when(notificationRepository.existsByUsuarioIdAndChaveDedup(2L, "ocorrencia:99:alerta"))
                .thenReturn(false);
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Notification result = service.criarSeNaoExiste(
                dest, null, "DAS vence", "Empresa ABC", "alta",
                "OBRIGACAO_ALERTA", "ocorrencia:99:alerta", "/meu-trabalho"
        );

        assertNotNull(result);
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertEquals("ocorrencia:99:alerta", captor.getValue().getChaveDedup());
        assertEquals("/meu-trabalho", captor.getValue().getLink());
        assertEquals(dest, captor.getValue().getUsuario());
        assertEquals("OBRIGACAO_ALERTA", captor.getValue().getTipo());
    }

    @Test
    void criarSeNaoExiste_semDestinatarioOuChave_retornaNull() {
        assertNull(service.criarSeNaoExiste(null, null, "t", "d", "normal", "TIPO", "k", null));
        Usuario dest = new Usuario();
        dest.setId(1L);
        assertNull(service.criarSeNaoExiste(dest, null, "t", "d", "normal", "TIPO", null, null));
        verify(notificationRepository, never()).existsByUsuarioIdAndChaveDedup(any(), any());
    }
}
