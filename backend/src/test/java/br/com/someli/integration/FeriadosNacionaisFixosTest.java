package br.com.someli.integration;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeriadosNacionaisFixosTest {

    @Test
    void ano2026_temFixosESextaFeiraSanta() {
        Map<String, String> porData = FeriadosNacionaisFixos.doAno(2026).stream()
                .collect(Collectors.toMap(f -> f.date, f -> f.name));

        assertEquals("Dia da Consciência Negra", porData.get("2026-11-20"));
        assertEquals("Tiradentes", porData.get("2026-04-21"));
        assertEquals("Sexta-feira Santa", porData.get("2026-04-03")); // Páscoa 2026: 05/04
        assertEquals("Natal", porData.get("2026-12-25"));
    }

    @Test
    void apiForaDoAr_usaListaLocalENaoGuardaNoCache() {
        RestTemplate rest = mock(RestTemplate.class);
        when(rest.getForObject(anyString(), any())).thenThrow(new RestClientException("fora do ar"));
        BrasilApiClient client = new BrasilApiClient(rest);

        List<BrasilApiClient.FeriadoDto> primeira = client.listarFeriadosNacionais(2026);
        client.listarFeriadosNacionais(2026);

        assertTrue(client.feriadosNacionais(2026).contains(LocalDate.of(2026, 11, 20)));
        assertTrue(primeira.size() >= 9);
        // Não guardou a falha: tenta a API de novo nas próximas chamadas
        verify(rest, times(3)).getForObject(anyString(), any());
    }
}
