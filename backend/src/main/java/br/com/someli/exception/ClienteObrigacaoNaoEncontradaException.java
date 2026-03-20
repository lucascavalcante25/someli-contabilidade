package br.com.someli.exception;

public class ClienteObrigacaoNaoEncontradaException extends RuntimeException {
    public ClienteObrigacaoNaoEncontradaException(String message) {
        super(message);
    }
}
