package br.com.someli.security;

import br.com.someli.exception.RegraNegocioException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Cifra login, senha e observação dos acessos do cliente (AES-256-GCM).
 * A chave vem só de COFRE_CHAVE_MESTRA (32 bytes em Base64), sem valor padrão.
 * O contexto (ex.: "cliente:7:acesso:senha") entra como AAD.
 */
@Component
public class CofreCrypto {

    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    public static final String MENSAGEM_DESLIGADO =
            "Cofre de acessos desligado: configure COFRE_CHAVE_MESTRA no servidor";

    private final SecretKeySpec chave;
    private final SecureRandom random = new SecureRandom();

    public CofreCrypto(@Value("${app.cofre.chave-mestra:}") String chaveBase64) {
        this.chave = decodificar(chaveBase64);
    }

    private static SecretKeySpec decodificar(String chaveBase64) {
        if (chaveBase64 == null || chaveBase64.isBlank()) return null;
        try {
            byte[] bytes = Base64.getDecoder().decode(chaveBase64.trim());
            return bytes.length == 32 ? new SecretKeySpec(bytes, "AES") : null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public boolean configurado() {
        return chave != null;
    }

    public byte[] cifrar(byte[] dado, String contexto) {
        exigirChave();
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, chave, new GCMParameterSpec(TAG_BITS, iv));
            cipher.updateAAD(contexto.getBytes(StandardCharsets.UTF_8));
            byte[] cifrado = cipher.doFinal(dado);
            return ByteBuffer.allocate(iv.length + cifrado.length).put(iv).put(cifrado).array();
        } catch (RegraNegocioException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao cifrar acesso");
        }
    }

    public byte[] decifrar(byte[] dado, String contexto) {
        exigirChave();
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, chave, new GCMParameterSpec(TAG_BITS, dado, 0, IV_BYTES));
            cipher.updateAAD(contexto.getBytes(StandardCharsets.UTF_8));
            return cipher.doFinal(dado, IV_BYTES, dado.length - IV_BYTES);
        } catch (RegraNegocioException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Acesso guardado não pôde ser aberto (chave mestra trocada ou dado alterado)");
        }
    }

    public byte[] cifrarTexto(String texto, String contexto) {
        return cifrar(texto.getBytes(StandardCharsets.UTF_8), contexto);
    }

    public String decifrarTexto(byte[] dado, String contexto) {
        return new String(decifrar(dado, contexto), StandardCharsets.UTF_8);
    }

    private void exigirChave() {
        if (chave == null) {
            throw new RegraNegocioException(MENSAGEM_DESLIGADO);
        }
    }
}
