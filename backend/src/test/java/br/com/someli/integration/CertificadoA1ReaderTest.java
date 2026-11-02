package br.com.someli.integration;

import br.com.someli.exception.RegraNegocioException;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class CertificadoA1ReaderTest {

    public static byte[] fixture(String nome) throws IOException {
        try (InputStream in = CertificadoA1ReaderTest.class.getResourceAsStream("/certificados/" + nome)) {
            return in.readAllBytes();
        }
    }

    @Test
    void leCertificadoValido_extraiCnpjTitularEValidade() throws IOException {
        CertificadoA1Reader.Info info = CertificadoA1Reader.ler(fixture("valido-11222333000181.p12"), "teste123".toCharArray());

        assertThat(info.cnpj()).isEqualTo("11222333000181");
        assertThat(info.titular()).isEqualTo("EMPRESA TESTE LTDA");
        assertThat(info.validoAte()).isAfter(LocalDate.now().plusYears(5));
        assertThat(info.vencido()).isFalse();
    }

    @Test
    void certificadoVencido_marcaVencido() throws IOException {
        CertificadoA1Reader.Info info = CertificadoA1Reader.ler(fixture("vencido-11222333000181.p12"), "teste123".toCharArray());

        assertThat(info.vencido()).isTrue();
    }

    @Test
    void senhaErrada_mensagemClaraSemDetalheTecnico() {
        assertThatThrownBy(() -> CertificadoA1Reader.ler(fixture("valido-11222333000181.p12"), "errada".toCharArray()))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessage("Senha incorreta ou arquivo de certificado inválido");
    }

    @Test
    void arquivoQueNaoEhCertificado_rejeita() {
        assertThatThrownBy(() -> CertificadoA1Reader.ler("nao sou pfx".getBytes(StandardCharsets.UTF_8), "x".toCharArray()))
                .isInstanceOf(RegraNegocioException.class);
    }

    @Test
    void extraiCnpjDoOtherNameIcpBrasil() {
        // OtherName { OID 2.16.76.1.3.3, [0] OCTET STRING "11222333000181" } como o JDK entrega em getSubjectAlternativeNames
        byte[] oid = {0x06, 0x05, 0x60, 0x4C, 0x01, 0x03, 0x03};
        byte[] valor = "11222333000181".getBytes(StandardCharsets.US_ASCII);
        byte[] der = new byte[4 + oid.length + 4 + valor.length];
        int i = 0;
        der[i++] = 0x30;
        der[i++] = (byte) (oid.length + 4 + valor.length + 2 - 2);
        der[i++] = (byte) 0xA0; // ruído de prefixo plausível
        der[i++] = 0x00;
        System.arraycopy(oid, 0, der, i, oid.length);
        i += oid.length;
        der[i++] = (byte) 0xA0;
        der[i++] = (byte) (valor.length + 2);
        der[i++] = 0x04;
        der[i++] = (byte) valor.length;
        System.arraycopy(valor, 0, der, i, valor.length);

        assertThat(CertificadoA1Reader.cnpjDoOtherName(der)).isEqualTo("11222333000181");
    }

    @Test
    void otherNameDeOutroTipo_naoDevolveCnpj() {
        byte[] cpfOid = {0x30, 0x0B, 0x06, 0x05, 0x60, 0x4C, 0x01, 0x03, 0x01, 0x04, 0x02, 0x31, 0x32};
        assertThat(CertificadoA1Reader.cnpjDoOtherName(cpfOid)).isNull();
    }
}
