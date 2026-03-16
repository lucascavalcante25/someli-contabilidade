package br.com.someli.controller;

import br.com.someli.domain.Perfil;
import br.com.someli.dto.LoginResponseDTO;
import br.com.someli.dto.UsuarioDTO;
import br.com.someli.security.JwtAuthenticationFilter;
import br.com.someli.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void deveRealizarLoginComSucesso() throws Exception {
        UsuarioDTO usuarioDTO = new UsuarioDTO();
        usuarioDTO.setId(1L);
        usuarioDTO.setNome("Administrador");
        usuarioDTO.setCpf("11111111111");
        usuarioDTO.setPerfil(Perfil.ADMIN);

        LoginResponseDTO response = new LoginResponseDTO("jwt-token", usuarioDTO);
        when(authService.login(any())).thenReturn(response);

        String payload = objectMapper.writeValueAsString(new LoginPayload("11111111111", "adm@Someli"));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token"))
                .andExpect(jsonPath("$.usuario.cpf").value("11111111111"))
                .andExpect(jsonPath("$.usuario.perfil").value("ADMIN"));
    }

    private record LoginPayload(String cpf, String senha) {
    }
}
