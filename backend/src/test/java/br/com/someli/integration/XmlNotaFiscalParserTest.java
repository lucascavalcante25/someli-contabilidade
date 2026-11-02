package br.com.someli.integration;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

public class XmlNotaFiscalParserTest {

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

    public static final String NFSE_NACIONAL = """
            <?xml version="1.0" encoding="UTF-8"?>
            <NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
              <infNFSe Id="NFS35503082211222333000181000000000001226100000000012">
                <xLocEmi>São Paulo</xLocEmi>
                <nNFSe>12</nNFSe>
                <cStat>100</cStat>
                <dhProc>2026-10-16T08:00:00-03:00</dhProc>
                <emit><CNPJ>11222333000181</CNPJ><xNome>EMPRESA TESTE LTDA</xNome></emit>
                <valores><vBC>1500.00</vBC><vLiq>1450.00</vLiq></valores>
                <DPS versao="1.00">
                  <infDPS Id="DPS355030821122233300018100900000000000012">
                    <dhEmi>2026-10-15T10:00:00-03:00</dhEmi>
                    <dCompet>2026-09-30</dCompet>
                    <serie>900</serie>
                    <nDPS>12</nDPS>
                    <prest><CNPJ>11222333000181</CNPJ></prest>
                    <toma><CNPJ>99888777000166</CNPJ><xNome>TOMADOR SA</xNome></toma>
                    <valores><vServPrest><vServ>1500.00</vServ></vServPrest></valores>
                  </infDPS>
                </DPS>
              </infNFSe>
            </NFSe>
            """;

    @Test
    void parseNfseLayoutNacional() {
        var r = XmlNotaFiscalParser.parse(NFSE_NACIONAL.getBytes(StandardCharsets.UTF_8));
        assertTrue(r.ok, r.mensagemErro);
        assertEquals("NFSE", r.tipo);
        assertEquals("35503082211222333000181000000000001226100000000012", r.chaveAcesso);
        assertEquals("12", r.numero);
        assertEquals("900", r.serie);
        assertEquals("11222333000181", r.cnpjEmitente);
        assertEquals("99888777000166", r.cnpjDestinatario);
        assertEquals(java.time.LocalDate.of(2026, 10, 15), r.dataEmissao);
        assertEquals("2026-09", r.competencia, "competência vem do dCompet da DPS, não da emissão");
        assertEquals(0, r.valorTotal.compareTo(new java.math.BigDecimal("1500.00")));
    }

    @Test
    void parseNfseNacionalTomadorPessoaFisica() {
        String xml = NFSE_NACIONAL.replace("<toma><CNPJ>99888777000166</CNPJ>", "<toma><CPF>12345678909</CPF>");
        var r = XmlNotaFiscalParser.parse(xml.getBytes(StandardCharsets.UTF_8));
        assertTrue(r.ok);
        assertEquals("12345678909", r.cnpjDestinatario);
    }

    @Test
    void parseEventoCancelamentoNfseNacional() {
        String xml = """
                <evento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
                  <infEvento Id="EVT3550308221122233300018100000000000122610000000001210110101">
                    <nSeqEvento>1</nSeqEvento>
                    <pedRegEvento versao="1.00">
                      <infPedReg Id="PRE35503082211222333000181000000000001226100000000012101101001">
                        <chNFSe>35503082211222333000181000000000001226100000000012</chNFSe>
                        <e101101><xDesc>Cancelamento de NFS-e</xDesc><cMotivo>1</cMotivo></e101101>
                      </infPedReg>
                    </pedRegEvento>
                  </infEvento>
                </evento>
                """;
        var ev = XmlNotaFiscalParser.parseEventoNfse(xml.getBytes(StandardCharsets.UTF_8)).orElseThrow();
        assertEquals("35503082211222333000181000000000001226100000000012", ev.chave());
        assertEquals("101101", ev.codigo());
        assertTrue(ev.cancelamento());
    }

    @Test
    void eventoDeConfirmacaoNaoEhCancelamento() {
        String xml = """
                <evento><infEvento><pedRegEvento><infPedReg>
                  <chNFSe>35503082211222333000181000000000001226100000000012</chNFSe>
                  <e203202><xDesc>Confirmação do Tomador</xDesc></e203202>
                </infPedReg></pedRegEvento></infEvento></evento>
                """;
        var ev = XmlNotaFiscalParser.parseEventoNfse(xml.getBytes(StandardCharsets.UTF_8)).orElseThrow();
        assertEquals("203202", ev.codigo());
        assertFalse(ev.cancelamento());
    }

    @Test
    void eventoInvalidoDevolveVazio() {
        assertTrue(XmlNotaFiscalParser.parseEventoNfse("<x/>".getBytes(StandardCharsets.UTF_8)).isEmpty());
        assertTrue(XmlNotaFiscalParser.parseEventoNfse(new byte[0]).isEmpty());
    }
}
