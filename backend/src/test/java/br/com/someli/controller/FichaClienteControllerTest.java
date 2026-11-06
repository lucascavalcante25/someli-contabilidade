package br.com.someli.controller;

import br.com.someli.config.SecurityConfig;
import br.com.someli.dto.ClienteAcessoResumoDTO;
import br.com.someli.dto.ClienteAcessoReveladoDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.LimiteRequisicoesException;
import br.com.someli.security.JwtAuthenticationFilter;
import br.com.someli.security.JwtService;
import br.com.someli.service.ClienteAcessoService;
import br.com.someli.service.ClienteAnotacaoService;
import br.com.someli.service.FichaContagemService;
import br.com.someli.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = FichaClienteController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class FichaClienteControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private JwtService jwtService;
    @MockBean private UsuarioService usuarioService;
    @MockBean private ClienteAcessoService acessoService;
    @MockBean private ClienteAnotacaoService anotacaoService;
    @MockBean private FichaContagemService contagemService;

    private static final String ACESSO = """
            {"sistema":"e-CAC","url":"https://exemplo.test","login":"joao","senha":"x","setor":"FISCAL"}
            """;
    private static final String NOTA = """
            {"titulo":"Aviso","texto":"ligar amanhã","fixada":false}
            """;

    @Test
    void semToken_nenhumEndpointChegaNoService() throws Exception {
        mockMvc.perform(get("/clientes/fichas/contagens")).andExpect(status().isForbidden());
        mockMvc.perform(get("/clientes/7/acessos")).andExpect(status().isForbidden());
        mockMvc.perform(post("/clientes/7/acessos").contentType(MediaType.APPLICATION_JSON).content(ACESSO))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/acessos/9").contentType(MediaType.APPLICATION_JSON).content(ACESSO))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/acessos/9")).andExpect(status().isForbidden());
        mockMvc.perform(post("/acessos/9/revelar")).andExpect(status().isForbidden());
        mockMvc.perform(get("/clientes/7/anotacoes")).andExpect(status().isForbidden());
        mockMvc.perform(post("/clientes/7/anotacoes").contentType(MediaType.APPLICATION_JSON).content(NOTA))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/anotacoes/4").contentType(MediaType.APPLICATION_JSON).content(NOTA))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/anotacoes/4")).andExpect(status().isForbidden());
        verifyNoInteractions(acessoService, anotacaoService, contagemService);
    }

    @Test
    @WithMockUser
    void semPermissao_403EmTodos() throws Exception {
        when(acessoService.listar(anyLong())).thenThrow(new AcessoNegadoException("Sem permissão: CLIENTE_ACESSOS_VER"));
        when(acessoService.criar(anyLong(), any())).thenThrow(new AcessoNegadoException("Sem permissão: CLIENTE_ACESSOS_EDITAR"));
        when(acessoService.atualizar(anyLong(), any())).thenThrow(new AcessoNegadoException("Sem permissão: CLIENTE_ACESSOS_EDITAR"));
        when(acessoService.revelar(anyLong())).thenThrow(new AcessoNegadoException("Sem permissão: CLIENTE_ACESSOS_VER"));
        org.mockito.Mockito.doThrow(new AcessoNegadoException("Sem permissão: CLIENTE_ACESSOS_EDITAR"))
                .when(acessoService).desativar(anyLong());
        when(anotacaoService.listar(anyLong())).thenThrow(new AcessoNegadoException("Sem permissão: CLIENTES_VISUALIZAR"));
        when(anotacaoService.criar(anyLong(), any())).thenThrow(new AcessoNegadoException("Sem permissão: CLIENTES_EDITAR"));
        when(anotacaoService.atualizar(anyLong(), any())).thenThrow(new AcessoNegadoException("Sem permissão: CLIENTES_EDITAR"));
        org.mockito.Mockito.doThrow(new AcessoNegadoException("Sem permissão: CLIENTES_EDITAR"))
                .when(anotacaoService).desativar(anyLong());

        mockMvc.perform(get("/clientes/fichas/contagens")).andExpect(status().isOk());
        mockMvc.perform(get("/clientes/7/acessos")).andExpect(status().isForbidden());
        mockMvc.perform(post("/clientes/7/acessos").contentType(MediaType.APPLICATION_JSON).content(ACESSO))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/acessos/9").contentType(MediaType.APPLICATION_JSON).content(ACESSO))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/acessos/9")).andExpect(status().isForbidden());
        mockMvc.perform(post("/acessos/9/revelar")).andExpect(status().isForbidden());
        mockMvc.perform(get("/clientes/7/anotacoes")).andExpect(status().isForbidden());
        mockMvc.perform(post("/clientes/7/anotacoes").contentType(MediaType.APPLICATION_JSON).content(NOTA))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/anotacoes/4").contentType(MediaType.APPLICATION_JSON).content(NOTA))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/anotacoes/4")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void semAlcadaOuRecursoDeOutroCliente_403() throws Exception {
        when(acessoService.listar(eq(8L))).thenThrow(new AcessoNegadoException("Sem alçada sobre este cliente"));
        when(acessoService.revelar(99L)).thenThrow(new AcessoNegadoException("Sem alçada sobre este cliente"));
        when(acessoService.atualizar(eq(99L), any())).thenThrow(new AcessoNegadoException("Sem alçada sobre este cliente"));
        org.mockito.Mockito.doThrow(new AcessoNegadoException("Sem alçada sobre este cliente"))
                .when(acessoService).desativar(99L);
        when(anotacaoService.listar(8L)).thenThrow(new AcessoNegadoException("Sem alçada sobre este cliente"));
        when(anotacaoService.atualizar(eq(40L), any())).thenThrow(new AcessoNegadoException("Sem alçada sobre este cliente"));
        org.mockito.Mockito.doThrow(new AcessoNegadoException("Sem alçada sobre este cliente"))
                .when(anotacaoService).desativar(40L);

        mockMvc.perform(get("/clientes/8/acessos")).andExpect(status().isForbidden());
        mockMvc.perform(post("/acessos/99/revelar")).andExpect(status().isForbidden());
        mockMvc.perform(put("/acessos/99").contentType(MediaType.APPLICATION_JSON).content(ACESSO))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/acessos/99")).andExpect(status().isForbidden());
        mockMvc.perform(get("/clientes/8/anotacoes")).andExpect(status().isForbidden());
        mockMvc.perform(put("/anotacoes/40").contentType(MediaType.APPLICATION_JSON).content(NOTA))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/anotacoes/40")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void listar_naoTrazSenha_eRevelarNaoFicaEmCache() throws Exception {
        when(acessoService.listar(7L)).thenReturn(java.util.List.of(new ClienteAcessoResumoDTO(
                9L, 7L, "e-CAC", "https://exemplo.test", "joa•••", "FISCAL", "MANUAL", "Ana", LocalDateTime.parse("2026-11-06T12:00:00"))));
        when(acessoService.revelar(9L)).thenReturn(new ClienteAcessoReveladoDTO(9L, "joao", "x", null));

        mockMvc.perform(get("/clientes/7/acessos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].loginMascarado").value("joa•••"))
                .andExpect(jsonPath("$[0].senha").doesNotExist())
                .andExpect(jsonPath("$[0].observacao").doesNotExist());
        mockMvc.perform(post("/acessos/9/revelar"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.login").value("joao"));
    }

    @Test
    @WithMockUser
    void criarSemSistema_400() throws Exception {
        mockMvc.perform(post("/clientes/7/acessos").contentType(MediaType.APPLICATION_JSON).content("{\"login\":\"a\",\"senha\":\"b\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(acessoService);
    }

    @Test
    @WithMockUser
    void revelarAlemDoLimite_429() throws Exception {
        when(acessoService.revelar(9L)).thenThrow(new LimiteRequisicoesException("Muitas revelações de acesso. Espere um minuto e tente de novo."));
        mockMvc.perform(post("/acessos/9/revelar")).andExpect(status().isTooManyRequests());
    }
}
