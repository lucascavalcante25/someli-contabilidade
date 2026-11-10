package br.com.someli.controller;

import br.com.someli.config.SecurityConfig;
import br.com.someli.dto.TagDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.security.JwtAuthenticationFilter;
import br.com.someli.security.JwtService;
import br.com.someli.service.TagService;
import br.com.someli.service.TagSyncService;
import br.com.someli.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** PUT /clientes/{id}/segmento: arrastar o cartão no Painel V2 grava o segmento do cliente. */
@WebMvcTest(controllers = TagController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class TagControllerSegmentoTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private JwtService jwtService;
    @MockBean private UsuarioService usuarioService;
    @MockBean private TagService tagService;
    @MockBean private TagSyncService tagSyncService;

    private static final String SERVICOS = "{\"segmento\":\"SERVICOS\"}";

    @Test
    void semToken_naoChegaNoService() throws Exception {
        mockMvc.perform(put("/clientes/7/segmento").contentType(MediaType.APPLICATION_JSON).content(SERVICOS))
                .andExpect(status().isForbidden());
        verifyNoInteractions(tagService);
    }

    @Test
    @WithMockUser
    void semPermissao_403() throws Exception {
        when(tagService.definirSegmento(eq(7L), anyString())).thenThrow(new AcessoNegadoException("Sem permissão: CLIENTES_EDITAR"));
        mockMvc.perform(put("/clientes/7/segmento").contentType(MediaType.APPLICATION_JSON).content(SERVICOS))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void semAlcadaNoCliente_403() throws Exception {
        when(tagService.definirSegmento(eq(8L), anyString())).thenThrow(new AcessoNegadoException("Cliente fora da sua alçada"));
        mockMvc.perform(put("/clientes/8/segmento").contentType(MediaType.APPLICATION_JSON).content(SERVICOS))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void segmentoEmBranco_400() throws Exception {
        mockMvc.perform(put("/clientes/7/segmento").contentType(MediaType.APPLICATION_JSON).content("{\"segmento\":\"\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(tagService);
    }

    @Test
    @WithMockUser
    void comPermissao_gravaEDevolveAsTags() throws Exception {
        when(tagService.definirSegmento(7L, "SERVICOS")).thenReturn(List.of(new TagDTO(21L, "SERVICOS", "#2563EB", false, null)));
        mockMvc.perform(put("/clientes/7/segmento").contentType(MediaType.APPLICATION_JSON).content(SERVICOS))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("SERVICOS"));
        verify(tagService).definirSegmento(7L, "SERVICOS");
    }
}
