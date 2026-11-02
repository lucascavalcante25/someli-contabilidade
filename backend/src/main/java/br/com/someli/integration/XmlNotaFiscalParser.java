package br.com.someli.integration;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.Set;

/**
 * Parser básico e gratuito de XML NFe/NFSe (sem API paga).
 * Extrai chave, CNPJs, número, data e valor quando presentes no layout padrão.
 */
public final class XmlNotaFiscalParser {

    public static final class Resultado {
        public String tipo; // NFE | NFSE | DESCONHECIDO
        public String chaveAcesso;
        public String numero;
        public String serie;
        public String cnpjEmitente;
        public String cnpjDestinatario;
        public LocalDate dataEmissao;
        public BigDecimal valorTotal;
        /** Competência declarada no documento (dCompet da NFS-e Nacional), quando existe. */
        public String competencia;
        public String mensagemErro;
        public boolean ok;
    }

    /** Evento da NFS-e Nacional (ex.: e101101 = cancelamento). */
    public record EventoNfse(String chave, String codigo) {
        private static final Set<String> CANCELAMENTOS = Set.of("101101", "105102", "105104", "305101");

        public boolean cancelamento() {
            return CANCELAMENTOS.contains(codigo);
        }
    }

    private XmlNotaFiscalParser() {
    }

    public static Resultado parse(byte[] xmlBytes) {
        Resultado r = new Resultado();
        if (xmlBytes == null || xmlBytes.length == 0) {
            r.ok = false;
            r.mensagemErro = "Arquivo XML vazio";
            r.tipo = "DESCONHECIDO";
            return r;
        }
        try {
            Document doc = lerDocumento(xmlBytes);
            Element root = doc.getDocumentElement();
            String rootName = localName(root);

            if (contem(doc, "infNFe") || "nfeProc".equalsIgnoreCase(rootName) || "NFe".equalsIgnoreCase(rootName)) {
                parseNfe(doc, r);
            } else if (contem(doc, "InfNfse") || contem(doc, "infNFSe")
                    || rootName.toLowerCase().contains("nfse")) {
                parseNfse(doc, r);
            } else {
                // Tentativa genérica
                parseNfe(doc, r);
                if (!r.ok) parseNfse(doc, r);
                if (!r.ok) {
                    r.tipo = "DESCONHECIDO";
                    r.mensagemErro = "Layout XML não reconhecido como NFe/NFSe";
                }
            }
        } catch (Exception e) {
            r.ok = false;
            r.tipo = "DESCONHECIDO";
            r.mensagemErro = "Falha ao ler XML: " + e.getMessage();
        }
        return r;
    }

    private static void parseNfe(Document doc, Resultado r) {
        r.tipo = "NFE";
        Element inf = firstElement(doc, "infNFe");
        if (inf != null) {
            String id = inf.getAttribute("Id");
            if (id != null && id.toUpperCase().startsWith("NFE")) {
                r.chaveAcesso = id.substring(3).replaceAll("\\D", "");
            }
        }
        if (r.chaveAcesso == null || r.chaveAcesso.isBlank()) {
            r.chaveAcesso = textOf(doc, "chNFe");
        }
        Element ide = firstElement(doc, "ide");
        if (ide != null) {
            r.numero = textChild(ide, "nNF");
            r.serie = textChild(ide, "serie");
            r.dataEmissao = parseData(textChild(ide, "dhEmi"), textChild(ide, "dEmi"));
        }
        Element emit = firstElement(doc, "emit");
        if (emit != null) r.cnpjEmitente = digits(textChild(emit, "CNPJ"));
        Element dest = firstElement(doc, "dest");
        if (dest != null) {
            String cnpj = textChild(dest, "CNPJ");
            if (cnpj == null || cnpj.isBlank()) cnpj = textChild(dest, "CPF");
            r.cnpjDestinatario = digits(cnpj);
        }
        Element total = firstElement(doc, "ICMSTot");
        if (total != null) {
            r.valorTotal = parseDecimal(textChild(total, "vNF"));
        }
        r.ok = r.chaveAcesso != null || r.numero != null || r.cnpjEmitente != null;
        if (!r.ok) r.mensagemErro = "NFe sem campos mínimos";
    }

    /** Parser seguro (sem DOCTYPE/entidades externas, contra XXE). */
    private static Document lerDocumento(byte[] xmlBytes) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xmlBytes));
    }

    /** Lê um evento da NFS-e Nacional: chave da nota (chNFSe) e código do grupo eNNNNNN. */
    public static Optional<EventoNfse> parseEventoNfse(byte[] xmlBytes) {
        if (xmlBytes == null || xmlBytes.length == 0) return Optional.empty();
        try {
            Document doc = lerDocumento(xmlBytes);
            String chave = digits(textOf(doc, "chNFSe"));
            if (chave == null) return Optional.empty();
            NodeList todos = doc.getElementsByTagNameNS("*", "*");
            for (int i = 0; i < todos.getLength(); i++) {
                String nome = localName((Element) todos.item(i));
                if (nome.matches("e\\d{6}")) {
                    return Optional.of(new EventoNfse(chave, nome.substring(1)));
                }
            }
            return Optional.empty();
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /** Layout do Padrão Nacional (Sefin/ADN): infNFSe Id="NFS" + 50 dígitos, DPS embutida. */
    private static boolean parseNfseNacional(Document doc, Resultado r) {
        Element inf = firstElement(doc, "infNFSe");
        Element nNfse = firstElement(doc, "nNFSe");
        if (inf == null || nNfse == null) return false;
        r.tipo = "NFSE";
        String id = inf.getAttribute("Id");
        if (id != null && id.toUpperCase().startsWith("NFS")) {
            r.chaveAcesso = digits(id.substring(3));
        }
        r.numero = nNfse.getTextContent().trim();
        Element dps = firstElement(inf, "infDPS");
        if (dps != null) {
            r.serie = textChild(dps, "serie");
            r.dataEmissao = parseData(textChild(dps, "dhEmi"));
            LocalDate compet = parseData(textChild(dps, "dCompet"));
            r.competencia = competenciaDe(compet).orElse(null);
            Element toma = firstElement(dps, "toma");
            if (toma != null) {
                r.cnpjDestinatario = digits(firstNonBlank(textChild(toma, "CNPJ"), textChild(toma, "CPF")));
            }
            r.valorTotal = parseDecimal(textOf(dps, "vServ"));
        }
        if (r.dataEmissao == null) r.dataEmissao = parseData(textOf(doc, "dhProc"));
        Element emit = firstElement(inf, "emit");
        if (emit != null) r.cnpjEmitente = digits(firstNonBlank(textChild(emit, "CNPJ"), textChild(emit, "CPF")));
        if (r.valorTotal == null) r.valorTotal = parseDecimal(textOf(inf, "vLiq"));
        r.ok = r.chaveAcesso != null || r.numero != null;
        if (!r.ok) r.mensagemErro = "NFSe sem campos mínimos";
        return true;
    }

    private static void parseNfse(Document doc, Resultado r) {
        if (parseNfseNacional(doc, r)) return;
        r.tipo = "NFSE";
        r.chaveAcesso = firstNonBlank(
                textOf(doc, "CodigoVerificacao"),
                textOf(doc, "codigo_verificacao"),
                textOf(doc, "NumeroNfse"),
                textOf(doc, "Numero")
        );
        r.numero = firstNonBlank(textOf(doc, "Numero"), textOf(doc, "NumeroNfse"));
        r.dataEmissao = parseData(
                textOf(doc, "DataEmissao"),
                textOf(doc, "DataEmissaoRps"),
                textOf(doc, "dhEmi")
        );
        // Prestador / tomador — layouts variam por município
        Element prestador = firstElement(doc, "PrestadorServico");
        if (prestador == null) prestador = firstElement(doc, "Prestador");
        if (prestador != null) {
            r.cnpjEmitente = digits(firstNonBlank(textChild(prestador, "Cnpj"), textChild(prestador, "CpfCnpj"), textOf(prestador, "Cnpj")));
        }
        if (r.cnpjEmitente == null) {
            r.cnpjEmitente = digits(textOf(doc, "Cnpj"));
        }
        Element tomador = firstElement(doc, "TomadorServico");
        if (tomador == null) tomador = firstElement(doc, "Tomador");
        if (tomador != null) {
            r.cnpjDestinatario = digits(firstNonBlank(textChild(tomador, "Cnpj"), textOf(tomador, "Cnpj")));
        }
        r.valorTotal = parseDecimal(firstNonBlank(
                textOf(doc, "ValorServicos"),
                textOf(doc, "ValorLiquidoNfse"),
                textOf(doc, "vServ")
        ));
        r.ok = r.numero != null || r.cnpjEmitente != null || r.chaveAcesso != null;
        if (!r.ok) r.mensagemErro = "NFSe sem campos mínimos";
    }

    private static boolean contem(Document doc, String local) {
        return firstElement(doc, local) != null;
    }

    private static Element firstElement(Document doc, String local) {
        NodeList list = doc.getElementsByTagNameNS("*", local);
        if (list.getLength() == 0) list = doc.getElementsByTagName(local);
        if (list.getLength() == 0) return null;
        return (Element) list.item(0);
    }

    private static Element firstElement(Element parent, String local) {
        if (parent == null) return null;
        NodeList list = parent.getElementsByTagNameNS("*", local);
        if (list.getLength() == 0) list = parent.getElementsByTagName(local);
        if (list.getLength() == 0) return null;
        return (Element) list.item(0);
    }

    private static String textOf(Document doc, String local) {
        Element e = firstElement(doc, local);
        return e != null ? e.getTextContent().trim() : null;
    }

    private static String textOf(Element parent, String local) {
        Element e = firstElement(parent, local);
        return e != null ? e.getTextContent().trim() : null;
    }

    private static String textChild(Element parent, String local) {
        if (parent == null) return null;
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            if (children.item(i) instanceof Element el && localName(el).equalsIgnoreCase(local)) {
                return el.getTextContent() != null ? el.getTextContent().trim() : null;
            }
        }
        return textOf(parent, local);
    }

    private static String localName(Element el) {
        String n = el.getLocalName();
        return n != null ? n : el.getTagName().replaceAll(".*:", "");
    }

    private static String digits(String s) {
        if (s == null) return null;
        String d = s.replaceAll("\\D", "");
        return d.isEmpty() ? null : d;
    }

    private static BigDecimal parseDecimal(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return new BigDecimal(s.trim().replace(",", "."));
        } catch (Exception e) {
            return null;
        }
    }

    private static LocalDate parseData(String... candidatos) {
        for (String s : candidatos) {
            if (s == null || s.isBlank()) continue;
            String t = s.trim();
            try {
                if (t.length() >= 19 && t.contains("T")) {
                    return LocalDateTime.parse(t.substring(0, 19), DateTimeFormatter.ISO_LOCAL_DATE_TIME).toLocalDate();
                }
                if (t.length() >= 10 && t.charAt(4) == '-') {
                    return LocalDate.parse(t.substring(0, 10));
                }
                if (t.length() == 10 && t.charAt(2) == '/') {
                    return LocalDate.parse(t, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                }
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private static String firstNonBlank(String... vals) {
        for (String v : vals) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }

    public static Optional<String> competenciaDe(LocalDate data) {
        if (data == null) return Optional.empty();
        return Optional.of(String.format("%04d-%02d", data.getYear(), data.getMonthValue()));
    }
}
