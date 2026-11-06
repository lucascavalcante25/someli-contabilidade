package br.com.someli.exception;

public class ClienteAnotacaoNaoEncontradaException extends RuntimeException {
    public ClienteAnotacaoNaoEncontradaException() {
        super("Anotação não encontrada");
    }
}
