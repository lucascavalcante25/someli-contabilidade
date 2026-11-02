package br.com.someli.security;

import br.com.someli.exception.RegraNegocioException;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CertificadoCryptoTest {

    static final String CHAVE = Base64.getEncoder().encodeToString(new byte[32]).replace('A', 'B');

    @Test
    void cifraEDecifra_comMesmoContexto() {
        CertificadoCrypto crypto = new CertificadoCrypto(CHAVE);
        byte[] original = "conteudo do pfx".getBytes(StandardCharsets.UTF_8);

        byte[] cifrado = crypto.cifrar(original, "cliente:7");

        assertThat(cifrado).isNotEqualTo(original);
        assertThat(new String(cifrado, StandardCharsets.ISO_8859_1)).doesNotContain("conteudo");
        assertThat(crypto.decifrar(cifrado, "cliente:7")).isEqualTo(original);
    }

    @Test
    void mesmoConteudo_geraCifrasDiferentes() {
        CertificadoCrypto crypto = new CertificadoCrypto(CHAVE);
        byte[] dado = {1, 2, 3};
        assertThat(crypto.cifrar(dado, "c")).isNotEqualTo(crypto.cifrar(dado, "c"));
    }

    @Test
    void cifraDeOutroCliente_naoAbre() {
        CertificadoCrypto crypto = new CertificadoCrypto(CHAVE);
        byte[] cifrado = crypto.cifrar(new byte[]{1, 2, 3}, "cliente:7");

        assertThatThrownBy(() -> crypto.decifrar(cifrado, "cliente:8")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void dadoAlterado_naoAbre() {
        CertificadoCrypto crypto = new CertificadoCrypto(CHAVE);
        byte[] cifrado = crypto.cifrar(new byte[]{1, 2, 3}, "c");
        cifrado[cifrado.length - 1] ^= 1;

        assertThatThrownBy(() -> crypto.decifrar(cifrado, "c")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void semChave_naoConfigurado_eRecusaCifrar() {
        CertificadoCrypto crypto = new CertificadoCrypto("");

        assertThat(crypto.configurado()).isFalse();
        assertThatThrownBy(() -> crypto.cifrar(new byte[]{1}, "c"))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("CERTIFICADO_CHAVE_MESTRA");
    }

    @Test
    void chaveDeTamanhoErrado_naoConfigurado() {
        assertThat(new CertificadoCrypto(Base64.getEncoder().encodeToString(new byte[16])).configurado()).isFalse();
        assertThat(new CertificadoCrypto("nao-e-base64!!").configurado()).isFalse();
    }
}
