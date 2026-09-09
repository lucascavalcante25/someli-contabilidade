package br.com.someli.service;

import br.com.someli.integration.BrasilApiClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DiaUtilServiceTest {

    @Mock BrasilApiClient brasilApiClient;

    DiaUtilService service;

    @BeforeEach
    void setUp() {
        service = new DiaUtilService(brasilApiClient);
    }

    @Test
    void sabadoMoveParaSegunda() {
        when(brasilApiClient.feriadosNacionais(2026)).thenReturn(Set.of());
        // 2026-09-12 é sábado
        assertEquals(LocalDate.of(2026, 9, 14), service.proximoDiaUtil(LocalDate.of(2026, 9, 12)));
    }

    @Test
    void domingoMoveParaSegunda() {
        when(brasilApiClient.feriadosNacionais(2026)).thenReturn(Set.of());
        assertEquals(LocalDate.of(2026, 9, 14), service.proximoDiaUtil(LocalDate.of(2026, 9, 13)));
    }

    @Test
    void feriadoEmDiaUtilMoveParaProximo() {
        // 2026-09-07 segunda — tratar como feriado fictício
        when(brasilApiClient.feriadosNacionais(2026)).thenReturn(Set.of(LocalDate.of(2026, 9, 7)));
        assertEquals(LocalDate.of(2026, 9, 8), service.proximoDiaUtil(LocalDate.of(2026, 9, 7)));
    }

    @Test
    void diaUtilSemFeriadoPermanece() {
        when(brasilApiClient.feriadosNacionais(2026)).thenReturn(Set.of());
        LocalDate quarta = LocalDate.of(2026, 9, 9);
        assertEquals(quarta, service.proximoDiaUtil(quarta));
        assertTrue(service.isDiaUtil(quarta));
    }

    @Test
    void feriadoNaSextaMoveParaSegunda() {
        when(brasilApiClient.feriadosNacionais(2026)).thenReturn(Set.of(LocalDate.of(2026, 9, 11)));
        // sexta 11/09 feriado → sáb 12 → dom 13 → seg 14
        assertEquals(LocalDate.of(2026, 9, 14), service.proximoDiaUtil(LocalDate.of(2026, 9, 11)));
    }
}
