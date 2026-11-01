package br.com.someli.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Stub do webhook Asaas (Trilha B — cobrança de honorários).
 * Não processa pagamento real; apenas confirma recebimento e registra log.
 * Ver docs/ASAAS_COBRANCA.md.
 */
@RestController
@RequestMapping("/webhooks/asaas")
public class AsaasWebhookController {

    private static final Logger log = LoggerFactory.getLogger(AsaasWebhookController.class);

    @PostMapping
    public ResponseEntity<Map<String, Object>> receber(
            @RequestBody(required = false) Map<String, Object> payload,
            @RequestHeader(value = "asaas-access-token", required = false) String token) {
        String evento = payload != null && payload.get("event") != null
                ? String.valueOf(payload.get("event"))
                : "UNKNOWN";
        log.info("[ASAAS-STUB] webhook recebido event={} tokenPresente={} keys={}",
                evento, token != null && !token.isBlank(),
                payload != null ? payload.keySet() : "null");
        return ResponseEntity.ok(Map.of(
                "ok", true,
                "stub", true,
                "message", "Webhook Asaas em modo stub — integração live ainda não habilitada",
                "event", evento
        ));
    }
}
