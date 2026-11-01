package br.com.someli.config;

import br.com.someli.controller.CnpjController;
import br.com.someli.controller.SintegraController;
import br.com.someli.security.JwtAuthenticationFilter;
import br.com.someli.security.JwtService;
import br.com.someli.service.CnpjService;
import br.com.someli.service.SintegraService;
import br.com.someli.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {SintegraController.class, CnpjController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class SecurityConfigTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private JwtService jwtService;
    @MockBean private UsuarioService usuarioService;
    @MockBean private SintegraService sintegraService;
    @MockBean private CnpjService cnpjService;

    private static final String BODY = "{\"cnpj\":\"11222333000181\"}";

    @Test
    void sintegra_semLogin_negaSemConsumirCredito() throws Exception {
        mockMvc.perform(post("/someli/api/sintegra/consulta")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    void cnpj_semLogin_nega() throws Exception {
        mockMvc.perform(get("/someli/api/consultaCNPJ/11222333000181"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void sintegra_logado_funciona() throws Exception {
        mockMvc.perform(post("/someli/api/sintegra/consulta")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void cnpj_logado_funciona() throws Exception {
        mockMvc.perform(get("/someli/api/consultaCNPJ/11222333000181"))
                .andExpect(status().isOk());
    }
}
