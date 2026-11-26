package br.com.someli.exception;

public class SimulacaoRtcCenarioNaoEncontradoException extends RuntimeException {
    public SimulacaoRtcCenarioNaoEncontradoException() {
        super("Cenário não encontrado");
    }
}
