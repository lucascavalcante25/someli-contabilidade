package br.com.someli.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class CertificadoDigitalStatusTest {

    @Test
    void naoInformado_quandoNull() {
        assertEquals(CertificadoDigitalStatus.NAO_INFORMADO, CertificadoDigitalStatus.de(null));
    }

    @Test
    void vencido_quandoDataPassada() {
        LocalDate hoje = LocalDate.of(2026, 11, 1);
        assertEquals(CertificadoDigitalStatus.VENCIDO,
                CertificadoDigitalStatus.de(LocalDate.of(2026, 10, 31), hoje, 30));
    }

    @Test
    void vencendo_dentroDaJanela() {
        LocalDate hoje = LocalDate.of(2026, 11, 1);
        assertEquals(CertificadoDigitalStatus.VENCENDO,
                CertificadoDigitalStatus.de(LocalDate.of(2026, 11, 20), hoje, 30));
        assertEquals(CertificadoDigitalStatus.VENCENDO,
                CertificadoDigitalStatus.de(hoje, hoje, 30));
    }

    @Test
    void ok_foraDaJanela() {
        LocalDate hoje = LocalDate.of(2026, 11, 1);
        assertEquals(CertificadoDigitalStatus.OK,
                CertificadoDigitalStatus.de(LocalDate.of(2026, 12, 15), hoje, 30));
    }

    @Test
    void diasRestantes_negativoQuandoVencido() {
        LocalDate hoje = LocalDate.of(2026, 11, 1);
        assertEquals(-5L, CertificadoDigitalStatus.diasRestantes(LocalDate.of(2026, 10, 27), hoje));
        assertNull(CertificadoDigitalStatus.diasRestantes(null, hoje));
    }
}
