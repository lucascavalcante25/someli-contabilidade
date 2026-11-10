package br.com.someli.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.assertj.core.api.Assertions.assertThat;

class CorsConfigTest {

    @Test
    void navegadorGuardaAChecagemDeCorsPorUmaHora() {
        // Servidor fica na Europa: sem Max-Age o navegador repete o OPTIONS a cada chamada
        CorsConfigurationSource source = new CorsConfig()
                .corsConfigurationSource("https://someli-contabilidade.vercel.app");
        CorsConfiguration config = source.getCorsConfiguration(new MockHttpServletRequest("GET", "/clientes"));

        assertThat(config).isNotNull();
        assertThat(config.getMaxAge()).isEqualTo(3600L);
        assertThat(config.getAllowedOrigins()).containsExactly("https://someli-contabilidade.vercel.app");
    }
}
