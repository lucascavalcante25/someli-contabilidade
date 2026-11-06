package br.com.someli.security;

import br.com.someli.exception.RegraNegocioException;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CofreCryptoTest {

    static final String CHAVE = Base64.getEncoder().encodeToString(new byte[32]).replace('A', 'C');

    @Test
    void cifraEDecifra_idaEVolta() {
        CofreCrypto crypto = new CofreCrypto(CHAVE);
        byte[] original = "segredo-de-teste".getBytes(StandardCharsets.UTF_8);

        byte[] cifrado = crypto.cifrar(original, "cliente:7:acesso:senha");

        assertThat(cifrado).isNotEqualTo(original);
        assertThat(new String(cifrado, StandardCharsets.ISO_8859_1)).doesNotContain("segredo");
        assertThat(crypto.decifrar(cifrado, "cliente:7:acesso:senha")).isEqualTo(original);
    }

    @Test
    void mesmoConteudo_geraIvDiferenteACadaChamada() {
        CofreCrypto crypto = new CofreCrypto(CHAVE);
        byte[] dado = "mesmo".getBytes(StandardCharsets.UTF_8);

        byte[] a = crypto.cifrar(dado, "c");
        byte[] b = crypto.cifrar(dado, "c");

        assertThat(a).isNotEqualTo(b);
        assertThat(Arrays.copyOf(a, 12)).isNotEqualTo(Arrays.copyOf(b, 12));
    }

    @Test
    void contextoDiferente_naoAbre() {
        CofreCrypto crypto = new CofreCrypto(CHAVE);
        byte[] cifrado = crypto.cifrarTexto("abc", "cliente:7:acesso:login");

        assertThatThrownBy(() -> crypto.decifrarTexto(cifrado, "cliente:8:acesso:login"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void semChave_desligaOCofre() {
        CofreCrypto crypto = new CofreCrypto("");

        assertThat(crypto.configurado()).isFalse();
        assertThatThrownBy(() -> crypto.cifrar(new byte[]{1}, "c"))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("COFRE_CHAVE_MESTRA");
    }

    @Test
    void chaveInvalidaOuCurta_desligaOCofre() {
        assertThat(new CofreCrypto(Base64.getEncoder().encodeToString(new byte[16])).configurado()).isFalse();
        assertThat(new CofreCrypto("nao-e-base64!!").configurado()).isFalse();
        assertThat(new CofreCrypto(null).configurado()).isFalse();
    }
}
