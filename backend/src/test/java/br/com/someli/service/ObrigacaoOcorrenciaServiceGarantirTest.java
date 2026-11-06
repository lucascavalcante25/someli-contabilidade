package br.com.someli.service;

import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.ObrigacaoOcorrencia;
import br.com.someli.domain.PeriodicidadeObrigacao;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaEventoRepository;
import br.com.someli.repository.ObrigacaoOcorrenciaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Novembro/2026: as mensais vencem em novembro e são da competência outubro (10/2026). */
@ExtendWith(MockitoExtension.class)
class ObrigacaoOcorrenciaServiceGarantirTest {

    @Mock ObrigacaoOcorrenciaRepository ocorrenciaRepository;
    @Mock ObrigacaoOcorrenciaEventoRepository eventoRepository;
    @Mock ClienteObrigacaoRepository clienteObrigacaoRepository;
    @Mock AuthorizationService authorizationService;
    @Mock AuditLogService auditLogService;
    @Mock DiaUtilService diaUtilService;

    ObrigacaoOcorrenciaService service;
    static final YearMonth NOVEMBRO = YearMonth.of(2026, 11);

    @BeforeEach
    void setUp() {
        service = new ObrigacaoOcorrenciaService(ocorrenciaRepository, eventoRepository, clienteObrigacaoRepository,
                authorizationService, auditLogService, diaUtilService);
        lenient().when(diaUtilService.ajustarVencimento(any(), any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(ocorrenciaRepository.save(any(ObrigacaoOcorrencia.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private ClienteObrigacao config(long id, String periodicidade, int dia) {
        ClienteObrigacao co = new ClienteObrigacao();
        co.setId(id);
        co.setAtivo(true);
        co.setPeriodicidade(periodicidade);
        co.setDiaVencimento(dia);
        co.setSetor("DEPARTAMENTO_PESSOAL");
        return co;
    }

    @Test
    void mensalJaComOcorrenciaDaCompetenciaAnterior_naoDuplica() {
        when(clienteObrigacaoRepository.findAll()).thenReturn(List.of(config(1L, PeriodicidadeObrigacao.MENSAL, 15)));
        when(ocorrenciaRepository.existsByClienteObrigacaoIdAndCompetencia(1L, "2026-10")).thenReturn(true);

        assertThat(service.garantirOcorrenciasAbertas(NOVEMBRO)).isZero();
        verify(ocorrenciaRepository, never()).save(any());
    }

    @Test
    void mensalSemOcorrencia_criaComCompetenciaDoMesAnterior() {
        when(clienteObrigacaoRepository.findAll()).thenReturn(List.of(config(1L, PeriodicidadeObrigacao.MENSAL, 20)));

        assertThat(service.garantirOcorrenciasAbertas(NOVEMBRO)).isEqualTo(1);

        ArgumentCaptor<ObrigacaoOcorrencia> criada = ArgumentCaptor.forClass(ObrigacaoOcorrencia.class);
        verify(ocorrenciaRepository).save(criada.capture());
        assertThat(criada.getValue().getCompetencia()).isEqualTo("2026-10");
        assertThat(criada.getValue().getDataVencimento()).isEqualTo(LocalDate.of(2026, 11, 20));
    }

    @Test
    void anualOuTrimestral_naoGeraTodoMes() {
        when(clienteObrigacaoRepository.findAll()).thenReturn(List.of(
                config(2L, PeriodicidadeObrigacao.ANUAL, 31), config(3L, PeriodicidadeObrigacao.TRIMESTRAL, 30)));

        assertThat(service.garantirOcorrenciasAbertas(NOVEMBRO)).isZero();
        verify(ocorrenciaRepository, never()).existsByClienteObrigacaoIdAndCompetencia(anyLong(), anyString());
    }
}
