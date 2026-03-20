package br.com.someli.exception;

public class ClienteDocumentoNaoEncontradoException extends RuntimeException {
    public ClienteDocumentoNaoEncontradoException(String message) {
        super(message);
    }
}
