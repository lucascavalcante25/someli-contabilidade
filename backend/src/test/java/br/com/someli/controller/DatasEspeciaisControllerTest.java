package br.com.someli.controller;

import br.com.someli.config.SecurityConfig;
import br.com.someli.dto.DataEspecialDTO;
import br.com.someli.dto.ProfissaoDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.security.JwtAuthenticationFilter;
import br.com.someli.security.JwtService;
import br.com.someli.service.DatasEspeciaisService;
import br.com.someli.service.ProfissaoService;
import br.com.someli.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Calendário de datas especiais e lista de profissões: autenticação, permissão e validação. */
@WebMvcTest(controllers = {DatasEspeciaisController.class, ProfissaoController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class DatasEspeciaisControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private JwtService jwtService;
    @MockBean private UsuarioService usuarioService;
    @MockBean private DatasEspeciaisService datasEspeciaisService;
    @MockBean private ProfissaoService profissaoService;

    @Test
    void semToken_naoChegaNoService() throws Exception {
        mockMvc.perform(get("/datas-especiais").param("ano", "2026").param("mes", "10")).andExpect(status().isForbidden());
        mockMvc.perform(get("/profissoes")).andExpect(status().isForbidden());
        verifyNoInteractions(datasEspeciaisService, profissaoService);
    }

    @Test
    @WithMockUser
    void semPermissao_403() throws Exception {
        when(datasEspeciaisService.eventosDoMes(anyInt(), anyInt())).thenThrow(new AcessoNegadoException("Sem permissão: CLIENTES_VISUALIZAR"));
        mockMvc.perform(get("/datas-especiais").param("ano", "2026").param("mes", "10")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void criarProfissaoSemPermissao_403() throws Exception {
        when(profissaoService.criar(any())).thenThrow(new AcessoNegadoException("Sem permissão: CLIENTES_EDITAR"));
        mockMvc.perform(post("/profissoes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Barbeiro\",\"dia\":5,\"mes\":9}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void profissaoComDiaInvalido_400() throws Exception {
        mockMvc.perform(post("/profissoes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Barbeiro\",\"dia\":40,\"mes\":9}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/profissoes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\" \",\"dia\":5,\"mes\":9}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(profissaoService);
    }

    @Test
    @WithMockUser
    void comPermissao_devolveEventosDoMes() throws Exception {
        DataEspecialDTO e = new DataEspecialDTO();
        e.setData(LocalDate.of(2026, 10, 25));
        e.setTipo("DIA_PROFISSAO");
        e.setClienteId(1L);
        e.setClienteNome("Sorriso");
        e.setProfissao("Dentista");
        when(datasEspeciaisService.eventosDoMes(2026, 10)).thenReturn(List.of(e));
        mockMvc.perform(get("/datas-especiais").param("ano", "2026").param("mes", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].data").value("2026-10-25"))
                .andExpect(jsonPath("$[0].profissao").value("Dentista"));
    }

    @Test
    @WithMockUser
    void listaProfissoes() throws Exception {
        when(profissaoService.listar()).thenReturn(List.of(new ProfissaoDTO(3L, "Dentista", 25, 10, "863050", true)));
        mockMvc.perform(get("/profissoes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Dentista"))
                .andExpect(jsonPath("$[0].cnaePrefixos").value("863050"));
    }
}
