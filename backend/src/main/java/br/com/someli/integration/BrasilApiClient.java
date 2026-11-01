package br.com.someli.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Cliente HTTP para BrasilAPI (gratuita): CEP e feriados nacionais.
 * https://brasilapi.com.br
 */
@Component
public class BrasilApiClient {

    private static final Logger log = LoggerFactory.getLogger(BrasilApiClient.class);
    private static final String BASE = "https://brasilapi.com.br/api";

    private final RestTemplate restTemplate;
    private final Map<Integer, List<FeriadoDto>> cacheFeriados = new ConcurrentHashMap<>();

    public BrasilApiClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Consulta CEP (apenas dígitos). Retorna null se não encontrado / erro.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> consultarCep(String cep) {
        String digits = cep == null ? "" : cep.replaceAll("\\D", "");
        if (digits.length() != 8) {
            throw new IllegalArgumentException("CEP deve conter 8 dígitos");
        }
        try {
            return restTemplate.getForObject(BASE + "/cep/v2/" + digits, Map.class);
        } catch (RestClientException e) {
            log.warn("Falha ao consultar CEP {} na BrasilAPI: {}", digits, e.getMessage());
            return null;
        }
    }

    /**
     * Feriados nacionais do ano (datas). Em falha de rede retorna conjunto vazio (não bloqueia o sistema).
     */
    public Set<LocalDate> feriadosNacionais(int ano) {
        return listarFeriadosNacionais(ano).stream()
                .map(f -> LocalDate.parse(f.date))
                .collect(Collectors.toCollection(HashSet::new));
    }

    /**
     * Feriados nacionais do ano com nome e tipo (BrasilAPI: date, name, type).
     * Em falha de rede retorna lista vazia.
     */
    public List<FeriadoDto> listarFeriadosNacionais(int ano) {
        return cacheFeriados.computeIfAbsent(ano, this::buscarFeriadosNacionais);
    }

    private List<FeriadoDto> buscarFeriadosNacionais(int ano) {
        try {
            FeriadoDto[] arr = restTemplate.getForObject(BASE + "/feriados/v1/" + ano, FeriadoDto[].class);
            if (arr == null || arr.length == 0) return Collections.emptyList();
            return Arrays.stream(arr)
                    .filter(f -> f != null && f.date != null && !f.date.isBlank())
                    .sorted(Comparator.comparing(f -> f.date))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("Falha ao consultar feriados {} na BrasilAPI: {}", ano, e.getMessage());
            return Collections.emptyList();
        }
    }

    public static class FeriadoDto {
        public String date;
        public String name;
        public String type;
    }
}
