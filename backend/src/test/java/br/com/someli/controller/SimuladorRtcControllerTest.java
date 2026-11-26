package br.com.someli.controller;

import br.com.someli.config.SecurityConfig;
import br.com.someli.domain.RegimeRtc;
import br.com.someli.dto.SimulacaoRtcResultadoDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.ExternalApiException;
import br.com.someli.security.JwtAuthenticationFilter;
import br.com.someli.security.JwtService;
import br.com.someli.service.SimuladorRtcService;
import br.com.someli.service.UsuarioService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SimuladorRtcController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class SimuladorRtcControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private JwtService jwtService;
    @MockBean private UsuarioService usuarioService;
    @MockBean private SimuladorRtcService service;

    private static final String CALCULO = """
            {"regime":"REGIME_REGULAR","operacao":{"id":"a","itens":[{"numero":1}]}}
            """;
    private static final String CENARIO = """
            {"nome":"Cenário fictício","regime":"SIMPLES_NACIONAL","operacao":{"id":"a","itens":[{"numero":1}]}}
            """;

    @Test
    void semToken_nenhumEndpointChegaNoService() throws Exception {
        mockMvc.perform(get("/simulador-rtc/versoes")).andExpect(status().isForbidden());
        mockMvc.perform(post("/simulador-rtc/calcular").contentType(MediaType.APPLICATION_JSON).content(CALCULO))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/clientes/7/simulacoes-rtc")).andExpect(status().isForbidden());
        mockMvc.perform(post("/clientes/7/simulacoes-rtc").contentType(MediaType.APPLICATION_JSON).content(CENARIO))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/simulacoes-rtc/40")).andExpect(status().isForbidden());
        mockMvc.perform(delete("/simulacoes-rtc/40")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    @WithMockUser
    void semPermissao_403EmTodos() throws Exception {
        AcessoNegadoException negado = new AcessoNegadoException("Sem permissão: SIMULADOR_RTC_USAR");
        when(service.versoes()).thenThrow(negado);
        when(service.calcular(any())).thenThrow(negado);
        when(service.listarCenarios(anyLong())).thenThrow(negado);
        when(service.salvarCenario(anyLong(), any())).thenThrow(negado);
        when(service.obterCenario(anyLong())).thenThrow(negado);
        doThrow(negado).when(service).excluirCenario(anyLong());

        mockMvc.perform(get("/simulador-rtc/versoes")).andExpect(status().isForbidden());
        mockMvc.perform(post("/simulador-rtc/calcular").contentType(MediaType.APPLICATION_JSON).content(CALCULO))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/clientes/7/simulacoes-rtc")).andExpect(status().isForbidden());
        mockMvc.perform(post("/clientes/7/simulacoes-rtc").contentType(MediaType.APPLICATION_JSON).content(CENARIO))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/simulacoes-rtc/40")).andExpect(status().isForbidden());
        mockMvc.perform(delete("/simulacoes-rtc/40")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void semAlcadaSobreOCliente_403() throws Exception {
        AcessoNegadoException semAlcada = new AcessoNegadoException("Sem alçada sobre este cliente");
        when(service.listarCenarios(8L)).thenThrow(semAlcada);
        when(service.salvarCenario(eq(8L), any())).thenThrow(semAlcada);
        when(service.obterCenario(99L)).thenThrow(semAlcada);
        doThrow(semAlcada).when(service).excluirCenario(99L);

        mockMvc.perform(get("/clientes/8/simulacoes-rtc")).andExpect(status().isForbidden());
        mockMvc.perform(post("/clientes/8/simulacoes-rtc").contentType(MediaType.APPLICATION_JSON).content(CENARIO))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/simulacoes-rtc/99")).andExpect(status().isForbidden());
        mockMvc.perform(delete("/simulacoes-rtc/99")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void calcular_devolveResultadoEVersao() throws Exception {
        when(service.calcular(any())).thenReturn(new SimulacaoRtcResultadoDTO(
                RegimeRtc.REGIME_REGULAR, "1.7.2", "V0073", null,
                new ObjectMapper().readTree("{\"objetos\":[]}")));

        mockMvc.perform(post("/simulador-rtc/calcular").contentType(MediaType.APPLICATION_JSON).content(CALCULO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versaoCalculadora").value("1.7.2"))
                .andExpect(jsonPath("$.resultado.objetos").isArray());
    }

    @Test
    @WithMockUser
    void calcular_semRegime_400() throws Exception {
        mockMvc.perform(post("/simulador-rtc/calcular").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"operacao\":{\"itens\":[]}}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    @WithMockUser
    void calculadoraForaDoAr_503ComMensagemDeRede() throws Exception {
        when(service.calcular(any())).thenThrow(new ExternalApiException(HttpStatus.SERVICE_UNAVAILABLE,
                "Calculadora da Receita indisponível no momento. Tente de novo em instantes."));

        mockMvc.perform(post("/simulador-rtc/calcular").contentType(MediaType.APPLICATION_JSON).content(CALCULO))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("indisponível")));
    }

    @Test
    @WithMockUser
    void salvarCenario_semNome_400() throws Exception {
        mockMvc.perform(post("/clientes/7/simulacoes-rtc").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\" \",\"regime\":\"REGIME_REGULAR\",\"operacao\":{}}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
