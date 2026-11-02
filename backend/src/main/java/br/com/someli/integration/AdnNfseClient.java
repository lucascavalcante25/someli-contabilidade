package br.com.someli.integration;

import java.io.IOException;
import java.security.KeyStore;

/** Distribuição de NFS-e do ADN (Portal Nacional) autenticada pelo certificado A1 do cliente (mTLS). */
public interface AdnNfseClient {

    /** Lote de até 50 documentos com NSU acima de {@code ultimoNsu}, filtrado pelo CNPJ consultado. */
    AdnNfseResposta consultarLote(KeyStore certificado, char[] senha, String cnpjConsulta, long ultimoNsu)
            throws IOException, InterruptedException;
}
