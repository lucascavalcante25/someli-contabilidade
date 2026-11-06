package br.com.someli.service;

import br.com.someli.exception.LimiteRequisicoesException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RevelarRateLimiterTest {

    @Test
    void trintaPassam_aTrigesimaPrimeiraRecusa_eAJanelaLibera() {
        Relogio relogio = new Relogio(Instant.parse("2026-11-06T15:00:00Z"));
        RevelarRateLimiter limiter = new RevelarRateLimiter(relogio);

        assertThatCode(() -> {
            for (int i = 0; i < RevelarRateLimiter.LIMITE; i++) limiter.consumir(3L);
        }).doesNotThrowAnyException();
        assertThatThrownBy(() -> limiter.consumir(3L)).isInstanceOf(LimiteRequisicoesException.class);

        relogio.avancarSegundos(61);
        assertThatCode(() -> limiter.consumir(3L)).doesNotThrowAnyException();
    }

    private static final class Relogio extends Clock {
        private Instant agora;

        private Relogio(Instant agora) {
            this.agora = agora;
        }

        void avancarSegundos(long segundos) {
            agora = agora.plusSeconds(segundos);
        }

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return agora; }
    }
}
