package br.com.someli.exception;

public class ClienteAcessoNaoEncontradoException extends RuntimeException {
    public ClienteAcessoNaoEncontradoException() {
        super("Acesso não encontrado");
    }
}
