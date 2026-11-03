package br.com.someli.controller;

import br.com.someli.config.SecurityConfig;
import br.com.someli.dto.BoletoEnviadoDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.security.JwtAuthenticationFilter;
import br.com.someli.security.JwtService;
import br.com.someli.service.AuthorizationService;
import br.com.someli.service.DespesaMensalService;
import br.com.someli.service.FinanceiroPainelService;
import br.com.someli.service.FinanceiroService;
import br.com.someli.service.PagamentoMensalService;
import br.com.someli.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = FinanceiroController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class FinanceiroControllerBoletoTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private JwtService jwtService;
    @MockBean private UsuarioService usuarioService;
    @MockBean private FinanceiroService financeiroService;
    @MockBean private PagamentoMensalService pagamentoMensalService;
    @MockBean private DespesaMensalService despesaMensalService;
    @MockBean private AuthorizationService authorizationService;
    @MockBean private FinanceiroPainelService financeiroPainelService;

    private static final String URL = "/financeiro/pagamentos/7/boleto-enviado";
    private static final String CORPO = "{\"enviado\":true}";

    @Test
    void semToken_nega() throws Exception {
        mockMvc.perform(put(URL).param("mes", "11").param("ano", "2026")
                        .contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isForbidden());
        verifyNoInteractions(pagamentoMensalService);
    }

    @Test
    @WithMockUser
    void logadoSemPermissao_403() throws Exception {
        when(pagamentoMensalService.alterarBoletoEnviado(anyLong(), anyInt(), anyInt(), anyBoolean()))
                .thenThrow(new AcessoNegadoException("Sem permissão: FINANCEIRO_LANCAR"));
        mockMvc.perform(put(URL).param("mes", "11").param("ano", "2026")
                        .contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void logadoSemAlcada_403() throws Exception {
        when(pagamentoMensalService.alterarBoletoEnviado(anyLong(), anyInt(), anyInt(), anyBoolean()))
                .thenThrow(new AcessoNegadoException("Sem alçada sobre este cliente"));
        mockMvc.perform(put(URL).param("mes", "11").param("ano", "2026")
                        .contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void semCampoEnviado_400() throws Exception {
        mockMvc.perform(put(URL).param("mes", "11").param("ano", "2026")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(pagamentoMensalService);
    }

    @Test
    @WithMockUser
    void marca_devolveQuemEnviou() throws Exception {
        when(pagamentoMensalService.alterarBoletoEnviado(7L, 11, 2026, true))
                .thenReturn(new BoletoEnviadoDTO(7L, 11, 2026, true, null, "Karol"));
        mockMvc.perform(put(URL).param("mes", "11").param("ano", "2026")
                        .contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enviado").value(true))
                .andExpect(jsonPath("$.enviadoPor").value("Karol"));
    }
}
