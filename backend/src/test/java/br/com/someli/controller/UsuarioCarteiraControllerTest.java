package br.com.someli.controller;

import br.com.someli.config.SecurityConfig;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.security.JwtAuthenticationFilter;
import br.com.someli.security.JwtService;
import br.com.someli.service.UsuarioCarteiraService;
import br.com.someli.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UsuarioCarteiraController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class UsuarioCarteiraControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private JwtService jwtService;
    @MockBean private UsuarioService usuarioService;
    @MockBean private UsuarioCarteiraService service;

    private static final String CORPO = "{\"destinos\":{\"FISCAL\":6}}";

    @Test
    void semToken_nega() throws Exception {
        mockMvc.perform(get("/usuarios/5/carteira")).andExpect(status().isForbidden());
        mockMvc.perform(post("/usuarios/5/carteira/transferir").contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    @WithMockUser
    void semPermissao_403() throws Exception {
        when(service.transferir(anyLong(), anyMap())).thenThrow(new AcessoNegadoException("Sem permissão"));
        mockMvc.perform(post("/usuarios/5/carteira/transferir").contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void transferir_devolveQuantos() throws Exception {
        when(service.transferir(5L, Map.of("FISCAL", 6L))).thenReturn(3);
        mockMvc.perform(post("/usuarios/5/carteira/transferir").contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transferidos").value(3));
    }

    @Test
    @WithMockUser
    void semDestinos_400() throws Exception {
        mockMvc.perform(post("/usuarios/5/carteira/transferir").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
