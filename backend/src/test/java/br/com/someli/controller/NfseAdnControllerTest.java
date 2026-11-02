package br.com.someli.controller;

import br.com.someli.config.SecurityConfig;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.security.JwtAuthenticationFilter;
import br.com.someli.security.JwtService;
import br.com.someli.service.NfseAdnService;
import br.com.someli.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = NfseAdnController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class NfseAdnControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private JwtService jwtService;
    @MockBean private UsuarioService usuarioService;
    @MockBean private NfseAdnService service;

    private static final MockMultipartFile ARQUIVO =
            new MockMultipartFile("arquivo", "a.pfx", "application/x-pkcs12", new byte[]{1, 2, 3});

    // ---------- sem token: nenhum endpoint chega ao service ----------

    @Test
    void semToken_status_nega() throws Exception {
        mockMvc.perform(get("/clientes/7/nfse-adn")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void semToken_enviarCertificado_nega() throws Exception {
        mockMvc.perform(multipart("/clientes/7/nfse-adn/certificado").file(ARQUIVO).param("senha", "x"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void semToken_removerCertificado_nega() throws Exception {
        mockMvc.perform(delete("/clientes/7/nfse-adn/certificado")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void semToken_sincronizar_nega() throws Exception {
        mockMvc.perform(post("/clientes/7/nfse-adn/sincronizar")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void semToken_alterarAtivo_nega() throws Exception {
        mockMvc.perform(put("/clientes/7/nfse-adn/ativo").contentType(MediaType.APPLICATION_JSON).content("{\"ativo\":true}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    // ---------- logado sem permissão ou sem alçada: 403 vindo do service ----------

    @Test
    @WithMockUser
    void logadoSemAlcada_status_403() throws Exception {
        when(service.status(anyLong())).thenThrow(new AcessoNegadoException("Sem alçada sobre este cliente"));
        mockMvc.perform(get("/clientes/7/nfse-adn")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void logadoSemPermissao_enviarCertificado_403() throws Exception {
        when(service.salvarCertificado(anyLong(), any(), anyString()))
                .thenThrow(new AcessoNegadoException("Sem permissão: CERTIFICADO_A1_GERENCIAR"));
        mockMvc.perform(multipart("/clientes/7/nfse-adn/certificado").file(ARQUIVO).param("senha", "x"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void logadoSemPermissao_sincronizar_403() throws Exception {
        when(service.sincronizarAgora(anyLong())).thenThrow(new AcessoNegadoException("Sem permissão: CLIENTES_EDITAR"));
        mockMvc.perform(post("/clientes/7/nfse-adn/sincronizar")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void logadoSemAlcada_alterarAtivo_403() throws Exception {
        when(service.alterarAtivo(anyLong(), anyBoolean())).thenThrow(new AcessoNegadoException("Sem alçada"));
        mockMvc.perform(put("/clientes/7/nfse-adn/ativo").contentType(MediaType.APPLICATION_JSON).content("{\"ativo\":true}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void alterarAtivo_semCampo_400() throws Exception {
        mockMvc.perform(put("/clientes/7/nfse-adn/ativo").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    @WithMockUser
    void enviarCertificado_semSenha_400() throws Exception {
        mockMvc.perform(multipart("/clientes/7/nfse-adn/certificado").file(ARQUIVO))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
