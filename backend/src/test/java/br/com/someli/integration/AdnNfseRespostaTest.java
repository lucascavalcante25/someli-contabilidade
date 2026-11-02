package br.com.someli.integration;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.zip.GZIPOutputStream;

import static org.assertj.core.api.Assertions.assertThat;

class AdnNfseRespostaTest {

    static String gzipBase64(String xml) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (GZIPOutputStream gz = new GZIPOutputStream(bos)) {
            gz.write(xml.getBytes(StandardCharsets.UTF_8));
        }
        return Base64.getEncoder().encodeToString(bos.toByteArray());
    }

    @Test
    void decodificaArquivoXmlGzipBase64() throws IOException {
        assertThat(new String(AdnNfseResposta.decodificarXml(gzipBase64("<NFSe/>")), StandardCharsets.UTF_8))
                .isEqualTo("<NFSe/>");
    }

    @Test
    void decodificaBase64SemGzip() {
        String b64 = Base64.getEncoder().encodeToString("<NFSe/>".getBytes(StandardCharsets.UTF_8));
        assertThat(new String(AdnNfseResposta.decodificarXml(b64), StandardCharsets.UTF_8)).isEqualTo("<NFSe/>");
    }

    @Test
    void arquivoInvalido_devolveNull() {
        assertThat(AdnNfseResposta.decodificarXml(null)).isNull();
        assertThat(AdnNfseResposta.decodificarXml("%%%")).isNull();
    }

    @Test
    void interpretaLoteComDocumentos() throws IOException {
        String body = """
                {"StatusProcessamento":"DOCUMENTOS_LOCALIZADOS",
                 "LoteDFe":[
                   {"NSU":101,"ChaveAcesso":"355030822","TipoDocumento":"NFSE","ArquivoXml":"%s"},
                   {"NSU":102,"ChaveAcesso":"355030822","TipoDocumento":"EVENTO","ArquivoXml":"%s"}
                 ]}
                """.formatted(gzipBase64("<NFSe/>"), gzipBase64("<evento/>"));

        AdnNfseResposta r = AdnNfseResposta.interpretar(200, body, null);

        assertThat(r.situacao()).isEqualTo(AdnNfseResposta.Situacao.DOCUMENTOS);
        assertThat(r.documentos()).hasSize(2);
        assertThat(r.documentos().get(0).nsu()).isEqualTo(101L);
        assertThat(r.documentos().get(0).tipo()).isEqualTo("NFSE");
        assertThat(r.documentos().get(1).evento()).isTrue();
        assertThat(new String(r.documentos().get(1).xml(), StandardCharsets.UTF_8)).isEqualTo("<evento/>");
    }

    @Test
    void aceitaCamposEmMinusculo() throws IOException {
        String body = "{\"loteDFe\":[{\"nsu\":\"7\",\"chaveAcesso\":\"1\",\"tipoDocumento\":\"nfse\",\"arquivoXml\":\"%s\"}]}"
                .formatted(gzipBase64("<NFSe/>"));

        AdnNfseResposta r = AdnNfseResposta.interpretar(200, body, null);

        assertThat(r.documentos()).singleElement().satisfies(d -> {
            assertThat(d.nsu()).isEqualTo(7L);
            assertThat(d.tipo()).isEqualTo("NFSE");
        });
    }

    @Test
    void http404_ouLoteVazio_semDocumentos() {
        assertThat(AdnNfseResposta.interpretar(404, "", null).situacao()).isEqualTo(AdnNfseResposta.Situacao.SEM_DOCUMENTOS);
        assertThat(AdnNfseResposta.interpretar(200, "{\"StatusProcessamento\":\"NENHUM_DOCUMENTO_LOCALIZADO\",\"LoteDFe\":[]}", null)
                .situacao()).isEqualTo(AdnNfseResposta.Situacao.SEM_DOCUMENTOS);
    }

    @Test
    void http429_respeitaRetryAfter() {
        AdnNfseResposta r = AdnNfseResposta.interpretar(429, "", "120");
        assertThat(r.situacao()).isEqualTo(AdnNfseResposta.Situacao.LIMITE);
        assertThat(r.retryAfterSegundos()).isEqualTo(120);
    }

    @Test
    void erroComListaDeErros_montaMensagem() {
        String body = "{\"Erros\":[{\"Codigo\":\"E1235\",\"Descricao\":\"Certificado não autorizado\"}]}";
        AdnNfseResposta r = AdnNfseResposta.interpretar(403, body, null);
        assertThat(r.situacao()).isEqualTo(AdnNfseResposta.Situacao.ERRO);
        assertThat(r.mensagem()).isEqualTo("E1235: Certificado não autorizado");
    }

    @Test
    void erroSemCorpo_mensagemComStatusHttp() {
        assertThat(AdnNfseResposta.interpretar(500, "<html>", null).mensagem()).isEqualTo("ADN respondeu HTTP 500");
    }
}
