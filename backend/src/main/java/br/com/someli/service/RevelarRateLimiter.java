package br.com.someli.service;

import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.LimiteRequisicoesException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/** No máximo 30 revelações de acesso por usuário a cada minuto. */
@Component
public class RevelarRateLimiter {

    public static final int LIMITE = 30;
    static final long JANELA_MS = 60_000L;

    private final Clock clock;
    private final ConcurrentHashMap<Long, Deque<Long>> hits = new ConcurrentHashMap<>();

    public RevelarRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public void consumir(Long usuarioId) {
        if (usuarioId == null) {
            throw new AcessoNegadoException("Usuário não autenticado");
        }
        long agora = clock.millis();
        long corte = agora - JANELA_MS;
        Deque<Long> fila = hits.computeIfAbsent(usuarioId, id -> new ArrayDeque<>());
        synchronized (fila) {
            while (!fila.isEmpty() && fila.peekFirst() <= corte) {
                fila.removeFirst();
            }
            if (fila.size() >= LIMITE) {
                throw new LimiteRequisicoesException("Muitas revelações de acesso. Espere um minuto e tente de novo.");
            }
            fila.addLast(agora);
        }
    }
}
