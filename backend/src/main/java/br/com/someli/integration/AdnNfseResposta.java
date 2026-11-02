package br.com.someli.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.zip.GZIPInputStream;

/**
 * Resposta normalizada do GET /contribuintes/DFe/{NSU} do ADN (Ambiente de Dados Nacional da NFS-e).
 * ArquivoXml vem em GZip + Base64. Os nomes de campo são lidos sem diferenciar maiúsculas.
 */
public record AdnNfseResposta(Situacao situacao, List<Documento> documentos, String mensagem, Integer retryAfterSegundos) {

    public enum Situacao { DOCUMENTOS, SEM_DOCUMENTOS, LIMITE, ERRO }

    public record Documento(long nsu, String chave, String tipo, byte[] xml) {
        private static final Set<String> TIPOS_EVENTO = Set.of("EVENTO", "EVENT", "PEDIDO_REGISTRO_EVENTO", "PEDREGISTROEVENTO");

        public boolean evento() {
            return tipo != null && TIPOS_EVENTO.contains(tipo);
        }

        public boolean nota() {
            return "NFSE".equals(tipo) || "NFS-E".equals(tipo);
        }
    }

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static AdnNfseResposta documentos(List<Documento> docs) {
        return new AdnNfseResposta(Situacao.DOCUMENTOS, docs, null, null);
    }

    public static AdnNfseResposta semDocumentos() {
        return new AdnNfseResposta(Situacao.SEM_DOCUMENTOS, List.of(), null, null);
    }

    public static AdnNfseResposta interpretar(int httpStatus, String body, String retryAfter) {
        if (httpStatus == 404) return semDocumentos();
        if (httpStatus == 429) {
            Integer segundos = retryAfter != null && retryAfter.trim().matches("\\d+") ? Integer.valueOf(retryAfter.trim()) : null;
            return new AdnNfseResposta(Situacao.LIMITE, List.of(), "Limite de consultas do ADN atingido", segundos);
        }
        JsonNode json = lerJson(body);
        if (httpStatus < 200 || httpStatus >= 300) {
            return new AdnNfseResposta(Situacao.ERRO, List.of(), mensagemErro(json, httpStatus), null);
        }
        JsonNode lote = campo(json, "LoteDFe");
        List<Documento> docs = new ArrayList<>();
        if (lote != null && lote.isArray()) {
            lote.forEach(item -> docs.add(documento(item)));
        } else if (lote != null && lote.isObject()) {
            docs.add(documento(lote));
        }
        return docs.isEmpty() ? semDocumentos() : documentos(docs);
    }

    private static Documento documento(JsonNode item) {
        JsonNode nsu = campo(item, "NSU");
        long n = 0;
        if (nsu != null) {
            try {
                n = Long.parseLong(nsu.asText().trim());
            } catch (NumberFormatException ignored) {
                n = 0;
            }
        }
        return new Documento(
                n,
                texto(item, "ChaveAcesso"),
                texto(item, "TipoDocumento") != null ? texto(item, "TipoDocumento").trim().toUpperCase(Locale.ROOT) : null,
                decodificarXml(texto(item, "ArquivoXml")));
    }

    private static String mensagemErro(JsonNode json, int httpStatus) {
        JsonNode erros = campo(json, "Erros");
        if (erros != null && erros.isArray() && !erros.isEmpty()) {
            List<String> partes = new ArrayList<>();
            erros.forEach(e -> {
                String codigo = texto(e, "Codigo");
                String descricao = texto(e, "Descricao");
                partes.add(codigo != null ? codigo + ": " + descricao : String.valueOf(descricao));
            });
            return String.join("; ", partes);
        }
        String msg = texto(json, "mensagem");
        if (msg == null) msg = texto(json, "message");
        return msg != null ? msg : "ADN respondeu HTTP " + httpStatus;
    }

    /** ArquivoXml: GZip+Base64 (padrão), Base64 puro ou XML em texto. */
    public static byte[] decodificarXml(String valor) {
        if (valor == null || valor.isBlank()) return null;
        String t = valor.trim();
        if (t.startsWith("<")) return t.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        try {
            byte[] raw = Base64.getDecoder().decode(t);
            if (raw.length > 2 && (raw[0] & 0xFF) == 0x1F && (raw[1] & 0xFF) == 0x8B) {
                try (GZIPInputStream gz = new GZIPInputStream(new ByteArrayInputStream(raw))) {
                    return gz.readAllBytes();
                }
            }
            return raw;
        } catch (IllegalArgumentException | IOException e) {
            return null;
        }
    }

    private static JsonNode lerJson(String body) {
        if (body == null || body.isBlank()) return null;
        try {
            return MAPPER.readTree(body);
        } catch (IOException e) {
            return null;
        }
    }

    private static JsonNode campo(JsonNode node, String nome) {
        if (node == null || !node.isObject()) return null;
        for (Iterator<Map.Entry<String, JsonNode>> it = node.fields(); it.hasNext(); ) {
            Map.Entry<String, JsonNode> e = it.next();
            if (e.getKey().equalsIgnoreCase(nome)) return e.getValue();
        }
        return null;
    }

    private static String texto(JsonNode node, String nome) {
        JsonNode v = campo(node, nome);
        return v == null || v.isNull() ? null : v.asText();
    }
}
