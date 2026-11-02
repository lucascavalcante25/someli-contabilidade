package br.com.someli.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.time.Duration;

/**
 * GET {base}/contribuintes/DFe/{NSU}?lote=true&cnpjConsulta=... com o certificado do cliente.
 * O ADN aceita certificado de mesmo CNPJ raiz (matriz consultando filial).
 */
@Component
public class AdnNfseHttpClient implements AdnNfseClient {

    private final String baseUrl;

    public AdnNfseHttpClient(@Value("${nfse.adn.base-url:https://adn.nfse.gov.br}") String baseUrl) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    @Override
    public AdnNfseResposta consultarLote(KeyStore certificado, char[] senha, String cnpjConsulta, long ultimoNsu)
            throws IOException, InterruptedException {
        HttpClient http = HttpClient.newBuilder()
                .sslContext(sslContext(certificado, senha))
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/contribuintes/DFe/" + ultimoNsu + "?lote=true&cnpjConsulta=" + cnpjConsulta))
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(60))
                .GET()
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        return AdnNfseResposta.interpretar(response.statusCode(), response.body(),
                response.headers().firstValue("Retry-After").orElse(null));
    }

    private static SSLContext sslContext(KeyStore certificado, char[] senha) throws IOException {
        try {
            KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            kmf.init(certificado, senha);
            SSLContext ctx = SSLContext.getInstance("TLS");
            ctx.init(kmf.getKeyManagers(), null, null);
            return ctx;
        } catch (GeneralSecurityException e) {
            throw new IOException("Certificado não pôde ser usado na conexão TLS", e);
        }
    }
}
