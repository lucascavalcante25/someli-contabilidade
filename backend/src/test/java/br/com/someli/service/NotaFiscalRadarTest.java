package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.NotaFiscalImport;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.RadarFiscalCompetenciaDTO;
import br.com.someli.repository.ClienteDocumentoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.NotaFiscalImportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotaFiscalRadarTest {

    @Mock NotaFiscalImportRepository repository;
    @Mock ClienteRepository clienteRepository;
    @Mock ClienteDocumentoRepository documentoRepository;
    @Mock ClienteDocumentoService documentoService;
    @Mock AuthorizationService authorizationService;

    NotaFiscalImportService service;

    @BeforeEach
    void setUp() {
        service = new NotaFiscalImportService(
                repository, clienteRepository, documentoRepository, documentoService, authorizationService);
    }

    @Test
    void radar_classificaEntradaESaidaPeloCnpj() {
        Cliente c = new Cliente();
        c.setId(1L);
        c.setCnpj("12345678000199");
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(c));
        doNothing().when(authorizationService).requireCompanyAccess(1L);
        doNothing().when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        when(documentoRepository.findByClienteIdOrderByDataUploadDesc(1L)).thenReturn(List.of());

        NotaFiscalImport saida = nota("2026-10", "12345678000199", "99887766000155", "100.00");
        NotaFiscalImport entrada = nota("2026-10", "11223344000155", "12345678000199", "50.00");
        when(repository.findByClienteIdOrderByDataEmissaoDescCreatedAtDesc(1L))
                .thenReturn(List.of(saida, entrada));

        List<RadarFiscalCompetenciaDTO> radar = service.radarPorCliente(1L);
        RadarFiscalCompetenciaDTO out = radar.stream()
                .filter(r -> "2026-10".equals(r.getCompetencia()))
                .findFirst()
                .orElseThrow();
        assertEquals(1, out.getQtdSaida());
        assertEquals(1, out.getQtdEntrada());
        assertEquals(0, new BigDecimal("100.00").compareTo(out.getValorSaida()));
        assertEquals(0, new BigDecimal("50.00").compareTo(out.getValorEntrada()));
        assertEquals("OK", out.getStatus());
    }

    @Test
    void radar_vazioSemDadosImportados() {
        Cliente c = new Cliente();
        c.setId(2L);
        c.setCnpj("00000000000191");
        when(clienteRepository.findById(2L)).thenReturn(Optional.of(c));
        doNothing().when(authorizationService).requireCompanyAccess(anyLong());
        doNothing().when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        when(documentoRepository.findByClienteIdOrderByDataUploadDesc(2L)).thenReturn(List.of());
        when(repository.findByClienteIdOrderByDataEmissaoDescCreatedAtDesc(2L)).thenReturn(List.of());

        assertTrue(service.radarPorCliente(2L).isEmpty());
    }

    @Test
    void radar_notaCanceladaNaoSomaENaoVira_semParse() {
        Cliente c = new Cliente();
        c.setId(1L);
        c.setCnpj("12345678000199");
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(c));
        when(documentoRepository.findByClienteIdOrderByDataUploadDesc(1L)).thenReturn(List.of());
        NotaFiscalImport cancelada = nota("2026-09", "12345678000199", "99887766000155", "1200.00");
        cancelada.setStatusParse("CANCELADA");
        when(repository.findByClienteIdOrderByDataEmissaoDescCreatedAtDesc(1L)).thenReturn(List.of(cancelada));

        RadarFiscalCompetenciaDTO out = service.radarPorCliente(1L).stream()
                .filter(r -> "2026-09".equals(r.getCompetencia()))
                .findFirst()
                .orElseThrow();

        assertEquals(0, out.getQtdSaida());
        assertEquals(0, BigDecimal.ZERO.compareTo(out.getValorSaida()));
        assertEquals(1, out.getQtdCancelada());
        assertEquals("OK", out.getStatus());
        assertEquals("1 nota cancelada nesta competência (fora dos totais).", out.getObservacao());
    }

    private static NotaFiscalImport nota(String comp, String emit, String dest, String valor) {
        NotaFiscalImport n = new NotaFiscalImport();
        n.setCompetencia(comp);
        n.setCnpjEmitente(emit);
        n.setCnpjDestinatario(dest);
        n.setValorTotal(new BigDecimal(valor));
        n.setStatusParse("OK");
        n.setDataEmissao(LocalDate.of(2026, 10, 15));
        n.setTipo("NFE");
        return n;
    }
}
