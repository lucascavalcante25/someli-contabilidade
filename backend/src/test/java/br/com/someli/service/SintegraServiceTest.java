package br.com.someli.service;

import br.com.someli.dto.SintegraDTO;
import br.com.someli.dto.SintegraRequestDTO;
import br.com.someli.exception.ExternalApiException;
import br.com.someli.integration.SintegraIntegration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SintegraServiceTest {

    @Mock private SintegraIntegration sintegraIntegration;

    private SintegraService service;
    private SintegraRequestDTO request;

    @BeforeEach
    void setUp() {
        service = new SintegraService(sintegraIntegration);
        ReflectionTestUtils.setField(service, "infosimplesToken", "token");
        request = new SintegraRequestDTO();
        request.setCnpj("11222333000181");
        request.setUf("CE");
    }

    @Test
    void desligada_recusaSemChamarProvedor() {
        assertThatThrownBy(() -> service.consultarSintegra(request))
                .isInstanceOfSatisfying(ExternalApiException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));

        verify(sintegraIntegration, never()).consultar(any());
    }

    @Test
    void ligada_consultaProvedor() {
        ReflectionTestUtils.setField(service, "habilitada", true);
        SintegraDTO dto = new SintegraDTO();
        when(sintegraIntegration.consultar(any())).thenReturn(dto);

        assertThat(service.consultarSintegra(request)).isSameAs(dto);
    }
}
