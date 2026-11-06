package br.com.someli.controller;

import br.com.someli.config.SecurityConfig;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.security.JwtAuthenticationFilter;
import br.com.someli.security.JwtService;
import br.com.someli.service.ObrigacaoOcorrenciaService;
import br.com.someli.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ObrigacaoOcorrenciaController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class ObrigacaoOcorrenciaControllerPainelTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private JwtService jwtService;
    @MockBean private UsuarioService usuarioService;
    @MockBean private ObrigacaoOcorrenciaService service;

    @Test
    void semToken_nega() throws Exception {
        mockMvc.perform(get("/ocorrencias").param("competencia", "2026-10")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    @WithMockUser
    void logadoSemPermissao_403() throws Exception {
        when(service.listarPorCompetencia(anyString())).thenThrow(new AcessoNegadoException("Sem permissão"));
        mockMvc.perform(get("/ocorrencias").param("competencia", "2026-10")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void logado_200() throws Exception {
        when(service.listarPorCompetencia("2026-10")).thenReturn(List.of());
        mockMvc.perform(get("/ocorrencias").param("competencia", "2026-10")).andExpect(status().isOk());
    }
}
