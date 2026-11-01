package br.com.someli.integration;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class XmlNotaFiscalParserTest {

    @Test
    void parseNfeBasica() {
        String xml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <nfeProc>
                  <NFe>
                    <infNFe Id="NFe35260112345678000190550010000001231000001234">
                      <ide>
                        <serie>1</serie>
                        <nNF>123</nNF>
                        <dhEmi>2026-08-15T10:00:00-03:00</dhEmi>
                      </ide>
                      <emit><CNPJ>12345678000190</CNPJ></emit>
                      <dest><CNPJ>11222333000181</CNPJ></dest>
                      <total><ICMSTot><vNF>1500.50</vNF></ICMSTot></total>
                    </infNFe>
                  </NFe>
                </nfeProc>
                """;
        var r = XmlNotaFiscalParser.parse(xml.getBytes(StandardCharsets.UTF_8));
        assertTrue(r.ok);
        assertEquals("NFE", r.tipo);
        assertEquals("35260112345678000190550010000001231000001234", r.chaveAcesso);
        assertEquals("123", r.numero);
        assertEquals("12345678000190", r.cnpjEmitente);
        assertEquals("11222333000181", r.cnpjDestinatario);
        assertEquals("2026-08", XmlNotaFiscalParser.competenciaDe(r.dataEmissao).orElse(null));
        assertEquals(0, r.valorTotal.compareTo(new java.math.BigDecimal("1500.50")));
    }

    @Test
    void parseVazioFalha() {
        var r = XmlNotaFiscalParser.parse(new byte[0]);
        assertFalse(r.ok);
    }
}
