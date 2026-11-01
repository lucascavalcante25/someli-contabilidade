package br.com.someli.integration;

import java.util.Map;

/**
 * Contrato para o Integra Contador (Serpro / RFB).
 * <p>
 * <b>Não é gratuito.</b> Exige contrato comercial com a Serpro, certificado digital
 * e credenciais OAuth. Este cliente é um stub seguro: não finge chamadas reais.
 * Ver {@code docs/INTEGRA_CONTADOR.md}.
 */
public interface IntegraContadorClient {

    /** true somente se credenciais e contrato estiverem configurados. */
    boolean isConfigured();

    /** Metadados de status para UI/admin (sem secrets). */
    Map<String, Object> status();

    /**
     * Consulta situação de obrigação no ecossistema Integra Contador.
     * Stub: lança {@link UnsupportedOperationException} se não configurado.
     */
    Map<String, Object> consultarSituacaoFiscal(String cnpj, String competencia);
}
