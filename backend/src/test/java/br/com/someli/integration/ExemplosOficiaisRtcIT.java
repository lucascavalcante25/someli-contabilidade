package br.com.someli.integration;

import br.com.someli.domain.RegimeRtc;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Confere, contra a calculadora da Receita rodando de verdade, os valores publicados em
 * calculadora-rtc-regime-regular/docs/exemplos.md ("Cálculo com observabilidade").
 *
 * <p>Não roda no {@code npm run test:all} comum (precisa da calculadora no ar). Para rodar:
 * <pre>RTC_REGIME_REGULAR_URL=http://localhost:8180/api mvn test -Dtest=ExemplosOficiaisRtcIT</pre>
 * Ver docs/CALCULADORA_RTC.md, seção "Conferir os exemplos oficiais".
 */
@EnabledIfEnvironmentVariable(named = "RTC_REGIME_REGULAR_URL", matches = "https?://.+")
class ExemplosOficiaisRtcIT {

    /** Entrada copiada do exemplo da documentação oficial (4 itens, fato gerador em 10/03/2027, Porto Alegre/RS). */
    static final String OPERACAO_EXEMPLO = """
            {
              "id": "6194602ea71cbf9431c236de4409d920",
              "versao": "1.0.0",
              "dhFatoGerador": "2027-03-10T10:00:00-03:00",
              "municipio": 4314902,
              "uf": "RS",
              "itens": [
                { "numero": 1, "ncm": "10063021", "cst": "200", "cClassTrib": "200003",
                  "baseCalculo": 100.00, "quantidade": 20, "unidade": "KG",
                  "aliquotasNominais": { "cbs": 8.8, "ibsEstadual": 0.05, "ibsMunicipal": 0.05 } },
                { "numero": 2, "ncm": "22030000", "cst": "000", "cClassTrib": "000001",
                  "quantidade": 12, "unidade": "LT",
                  "impostoSeletivo": { "cst": "000", "cClassTrib": "000001", "baseCalculo": 150.00,
                    "quantidade": 12, "unidade": "LT", "impostoInformado": 15.00 },
                  "aliquotasNominais": { "cbs": 8.8, "ibsEstadual": 0.05, "ibsMunicipal": 0.05,
                    "impostoSeletivo": { "adValorem": 10.0 } } },
                { "numero": 3, "nbs": "122011200", "cst": "200", "cClassTrib": "200028",
                  "baseCalculo": 1200.00,
                  "aliquotasNominais": { "cbs": 8.8, "ibsEstadual": 0.05, "ibsMunicipal": 0.05 } },
                { "numero": 4, "ncm": "02013000", "cst": "200", "cClassTrib": "200035",
                  "baseCalculo": 80.00,
                  "aliquotasNominais": { "cbs": 8.8, "ibsEstadual": 0.05, "ibsMunicipal": 0.05 } }
              ]
            }
            """;

    static RespostaRtc resposta;

    @BeforeAll
    static void calcular() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        CalculadoraRtcClient client = new CalculadoraRtcClient(new RestTemplate(), mapper,
                System.getenv("RTC_REGIME_REGULAR_URL"),
                System.getenv().getOrDefault("RTC_SIMPLES_URL", "http://localhost:8182/api"));
        resposta = client.calcular(RegimeRtc.REGIME_REGULAR, mapper.readTree(OPERACAO_EXEMPLO));
    }

    private static JsonNode item(int numero) {
        for (JsonNode o : resposta.corpo().get("objetos")) {
            if (o.get("nObj").asInt() == numero) return o;
        }
        throw new AssertionError("item " + numero + " ausente");
    }

    private static String texto(JsonNode no, String... caminho) {
        JsonNode atual = no;
        for (String c : caminho) atual = atual.path(c);
        return atual.asText();
    }

    @Test
    void exemplo1_arrozDaCestaBasica_reducao100_calculadoComAliquotaInformada() {
        JsonNode i = item(1);
        assertThat(i.get("estadoItem").asText()).isEqualTo("CALCULO_SIMULADO");
        assertThat(texto(i, "tribCalc", "IBSCBS", "gIBSCBS", "gCBS", "gRed", "pRedAliq")).startsWith("100");
        assertThat(new java.math.BigDecimal(texto(i, "tribCalc", "IBSCBS", "gIBSCBS", "gCBS", "vCBS"))).isZero();
    }

    @Test
    void exemplo2_cervejaComImpostoSeletivo_isDe15() {
        JsonNode i = item(2);
        assertThat(i.get("estadoItem").asText()).isEqualTo("CALCULO_SIMULADO");
        assertThat(new java.math.BigDecimal(texto(i, "tribCalc", "IS", "vIS"))).isEqualByComparingTo("15.00");
    }

    @Test
    void exemplo3_educacaoReducao60_valoresDaDocumentacao() {
        JsonNode g = item(3).path("tribCalc").path("IBSCBS").path("gIBSCBS");
        assertThat(new java.math.BigDecimal(g.path("vBC").asText())).isEqualByComparingTo("1200.00");
        assertThat(new java.math.BigDecimal(g.path("gCBS").path("vCBS").asText())).isEqualByComparingTo("42.24");
        assertThat(new java.math.BigDecimal(g.path("gIBSUF").path("vIBSUF").asText())).isEqualByComparingTo("0.24");
        assertThat(new java.math.BigDecimal(g.path("gIBSMun").path("vIBSMun").asText())).isEqualByComparingTo("0.24");
        assertThat(new java.math.BigDecimal(g.path("vIBS").asText())).isEqualByComparingTo("0.48");
    }

    @Test
    void exemplo4_ncmNaoVinculada_erroReg011SemDerrubarOsOutros() {
        JsonNode i = item(4);
        assertThat(i.get("estadoItem").asText()).isEqualTo("INCONSISTENCIA_ENTRADA");
        assertThat(i.get("erros").get(0).get("code").asText()).isEqualTo("REG-011");
    }

    @Test
    void exemplo5_totaisSomamSoOsItensCalculados() {
        JsonNode tot = resposta.corpo().path("total").path("tribCalc");
        assertThat(new java.math.BigDecimal(tot.path("ISTot").path("vIS").asText())).isEqualByComparingTo("15.00");
        assertThat(new java.math.BigDecimal(tot.path("IBSCBSTot").path("vBCIBSCBS").asText())).isEqualByComparingTo("1465.00");
        assertThat(new java.math.BigDecimal(tot.path("IBSCBSTot").path("gCBS").path("vCBS").asText())).isEqualByComparingTo("56.76");
        assertThat(new java.math.BigDecimal(tot.path("IBSCBSTot").path("gIBS").path("vIBS").asText())).isEqualByComparingTo("0.64");
    }

    @Test
    void versaoVemNosCabecalhos() {
        assertThat(resposta.versaoCalculadora()).isNotBlank();
        assertThat(resposta.versaoBase()).isNotBlank();
    }
}
