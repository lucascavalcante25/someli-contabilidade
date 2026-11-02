package br.com.someli.service;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.InscricaoEstadualConsultaDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.ExternalApiException;
import br.com.someli.integration.CnpjWsIntegration;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InscricaoEstadualServiceTest {

    private static final String CNPJ = "11222333000181";
    private static final String RESPOSTA = """
            {
              "razao_social": "EMPRESA TESTE LTDA",
              "simples": {
                "simples": "Sim", "data_opcao_simples": "2020-01-01", "data_exclusao_simples": null,
                "mei": "Não", "data_opcao_mei": null, "data_exclusao_mei": null,
                "atualizado_em": "2026-10-10T03:00:00.000Z"
              },
              "estabelecimento": {
                "situacao_cadastral": "Ativa",
                "inscricoes_estaduais": [
                  {"inscricao_estadual": "123", "ativo": true, "atualizado_em": "2026-09-01T10:00:00.000Z",
                   "estado": {"sigla": "CE"}},
                  {"inscricao_estadual": "456", "ativo": false, "atualizado_em": "2025-01-01T10:00:00.000Z",
                   "estado": {"sigla": "PE"}}
                ]
              }
            }
            """;

    @Mock private CnpjWsIntegration integration;
    @Mock private AuthorizationService authorizationService;

    private InscricaoEstadualService service;

    @BeforeEach
    void setUp() {
        service = new InscricaoEstadualService(integration, authorizationService);
    }

    private JsonNode json(String conteudo) throws Exception {
        return new ObjectMapper().readTree(conteudo);
    }

    @Test
    void consulta_devolveInscricoesESimples() throws Exception {
        when(integration.consultar(CNPJ)).thenReturn(json(RESPOSTA));

        InscricaoEstadualConsultaDTO dto = service.consultar("11.222.333/0001-81");

        assertThat(dto.cnpj()).isEqualTo(CNPJ);
        assertThat(dto.razaoSocial()).isEqualTo("EMPRESA TESTE LTDA");
        assertThat(dto.situacaoCadastral()).isEqualTo("Ativa");
        assertThat(dto.optanteSimples()).isTrue();
        assertThat(dto.dataOpcaoSimples()).isEqualTo("2020-01-01");
        assertThat(dto.optanteMei()).isFalse();
        assertThat(dto.simplesAtualizadoEm()).isEqualTo("2026-10-10T03:00:00.000Z");
        assertThat(dto.inscricoes()).hasSize(2);
        assertThat(dto.inscricoes().get(0).inscricao()).isEqualTo("123");
        assertThat(dto.inscricoes().get(0).ativa()).isTrue();
        assertThat(dto.inscricoes().get(0).uf()).isEqualTo("CE");
        assertThat(dto.inscricoes().get(1).ativa()).isFalse();
    }

    @Test
    void consulta_empresaSemInscricaoNemSimples_devolveVazio() throws Exception {
        when(integration.consultar(CNPJ)).thenReturn(json("{\"razao_social\":\"X\",\"estabelecimento\":{}}"));

        InscricaoEstadualConsultaDTO dto = service.consultar(CNPJ);

        assertThat(dto.inscricoes()).isEmpty();
        assertThat(dto.optanteSimples()).isFalse();
        assertThat(dto.optanteMei()).isFalse();
    }

    @Test
    void semPermissao_negaSemChamarProvedor() {
        doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.CONSULTAS_VISUALIZAR);

        assertThatThrownBy(() -> service.consultar(CNPJ)).isInstanceOf(AcessoNegadoException.class);

        verify(integration, never()).consultar(any());
    }

    @Test
    void cnpjInvalido_recusaSemChamarProvedor() {
        assertThatThrownBy(() -> service.consultar("123"))
                .isInstanceOfSatisfying(ExternalApiException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(integration, never()).consultar(any());
    }

    private void falhaCom(HttpStatus status) {
        when(integration.consultar(CNPJ)).thenThrow(
                HttpClientErrorException.create(status, "erro", HttpHeaders.EMPTY, new byte[0], null));
    }

    @Test
    void limiteExcedido_explicaEDevolve429() {
        falhaCom(HttpStatus.TOO_MANY_REQUESTS);

        assertThatThrownBy(() -> service.consultar(CNPJ))
                .isInstanceOfSatisfying(ExternalApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                    assertThat(ex.getMessage()).contains("3 consultas por minuto");
                });
    }

    @Test
    void cnpjInexistente_devolve404() {
        falhaCom(HttpStatus.NOT_FOUND);

        assertThatThrownBy(() -> service.consultar(CNPJ))
                .isInstanceOfSatisfying(ExternalApiException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void timeout_devolve504() {
        when(integration.consultar(CNPJ)).thenThrow(new ResourceAccessException("timeout"));

        assertThatThrownBy(() -> service.consultar(CNPJ))
                .isInstanceOfSatisfying(ExternalApiException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.GATEWAY_TIMEOUT));
    }
}
