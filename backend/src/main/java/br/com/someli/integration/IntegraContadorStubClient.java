package br.com.someli.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Implementação stub — ativa por padrão. Não realiza HTTP para a Serpro.
 */
@Component
public class IntegraContadorStubClient implements IntegraContadorClient {

    private final boolean enabledFlag;
    private final String consumerKeyConfigured;

    public IntegraContadorStubClient(
            @Value("${integra-contador.enabled:false}") boolean enabledFlag,
            @Value("${integra-contador.consumer-key:}") String consumerKeyConfigured) {
        this.enabledFlag = enabledFlag;
        this.consumerKeyConfigured = consumerKeyConfigured != null ? consumerKeyConfigured.trim() : "";
    }

    @Override
    public boolean isConfigured() {
        // Nunca "configurado" de verdade neste stub — exige implementação real + contrato
        return false;
    }

    @Override
    public Map<String, Object> status() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("provedor", "Serpro Integra Contador");
        m.put("gratuito", false);
        m.put("configured", isConfigured());
        m.put("enabledFlag", enabledFlag);
        m.put("consumerKeyPresent", !consumerKeyConfigured.isEmpty());
        m.put("modo", "STUB");
        m.put("mensagem",
                "Integra Contador é serviço oficial pago/pós-pago da Serpro. "
                        + "Configure contrato, certificado e OAuth antes de habilitar integração real. "
                        + "Ver docs/INTEGRA_CONTADOR.md");
        return m;
    }

    @Override
    public Map<String, Object> consultarSituacaoFiscal(String cnpj, String competencia) {
        throw new UnsupportedOperationException(
                "Integra Contador não configurado. Serviço oficial Serpro (pago). Ver docs/INTEGRA_CONTADOR.md");
    }
}
