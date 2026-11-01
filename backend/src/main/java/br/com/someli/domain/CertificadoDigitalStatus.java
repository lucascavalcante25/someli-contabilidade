package br.com.someli.domain;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Status operacional do certificado digital do cliente (sem arquivo/senha).
 * Janela de alerta padrão: 30 dias antes do vencimento.
 */
public enum CertificadoDigitalStatus {
    NAO_INFORMADO,
    OK,
    VENCENDO,
    VENCIDO;

    public static final int DIAS_ALERTA_PADRAO = 30;

    public static CertificadoDigitalStatus de(LocalDate vencimento) {
        return de(vencimento, LocalDate.now(), DIAS_ALERTA_PADRAO);
    }

    public static CertificadoDigitalStatus de(LocalDate vencimento, LocalDate hoje, int diasAlerta) {
        if (vencimento == null) {
            return NAO_INFORMADO;
        }
        if (hoje == null) {
            hoje = LocalDate.now();
        }
        if (vencimento.isBefore(hoje)) {
            return VENCIDO;
        }
        long dias = ChronoUnit.DAYS.between(hoje, vencimento);
        if (dias <= Math.max(0, diasAlerta)) {
            return VENCENDO;
        }
        return OK;
    }

    public static Long diasRestantes(LocalDate vencimento, LocalDate hoje) {
        if (vencimento == null) {
            return null;
        }
        if (hoje == null) {
            hoje = LocalDate.now();
        }
        return ChronoUnit.DAYS.between(hoje, vencimento);
    }
}
