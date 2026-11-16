package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteResponsavel;
import br.com.someli.domain.Profissao;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.DataEspecialDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.ProfissaoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Pedido da Patrícia: aniversário do dono, da empresa e dia da profissão do cliente. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DatasEspeciaisServiceTest {

    @Mock ClienteRepository clienteRepository;
    @Mock ProfissaoRepository profissaoRepository;
    @Mock ClienteResponsavelRepository clienteResponsavelRepository;
    @Mock NotificationService notificationService;
    @Mock AuthorizationService authorizationService;

    DatasEspeciaisService service;
    Usuario usuario = new Usuario();
    Profissao dentista = profissao(3L, "Dentista", 25, 10);
    Profissao psicologo = profissao(4L, "Psicólogo", 27, 8);

    @BeforeEach
    void setUp() {
        service = new DatasEspeciaisService(clienteRepository, profissaoRepository, clienteResponsavelRepository,
                notificationService, authorizationService);
        when(authorizationService.currentUser()).thenReturn(usuario);
        when(authorizationService.clienteIdsNaAlcada(usuario)).thenReturn(null);
        when(profissaoRepository.findAll()).thenReturn(List.of(dentista, psicologo));
    }

    private static Profissao profissao(Long id, String nome, int dia, int mes) {
        Profissao p = new Profissao();
        p.setId(id);
        p.setNome(nome);
        p.setDia(dia);
        p.setMes(mes);
        p.setAtivo(true);
        return p;
    }

    private static Cliente cliente(Long id, String fantasia) {
        Cliente c = new Cliente();
        c.setId(id);
        c.setRazaoSocial(fantasia + " LTDA");
        c.setNomeFantasia(fantasia);
        c.setProprietario("Dona " + fantasia);
        c.setTelefone("(85) 98888-7777");
        c.setAtivo(true);
        return c;
    }

    @Test
    void outubro_trazAniversarioDoDonoDaEmpresaEDiaDaProfissao() {
        Cliente sorriso = cliente(1L, "Sorriso");
        sorriso.setDataNascimentoResponsavel(LocalDate.of(1985, 10, 20));
        sorriso.setDataAbertura(LocalDate.of(2019, 10, 5));
        sorriso.setProfissaoId(3L);
        Cliente outro = cliente(2L, "Outro");
        outro.setDataNascimentoResponsavel(LocalDate.of(1990, 3, 1));
        when(clienteRepository.findAllWithResponsavel()).thenReturn(List.of(sorriso, outro));

        List<DataEspecialDTO> eventos = service.eventosDoMes(2026, 10);

        assertThat(eventos).extracting(DataEspecialDTO::getTipo, DataEspecialDTO::getData)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("ANIVERSARIO_EMPRESA", LocalDate.of(2026, 10, 5)),
                        org.assertj.core.groups.Tuple.tuple("ANIVERSARIO_RESPONSAVEL", LocalDate.of(2026, 10, 20)),
                        org.assertj.core.groups.Tuple.tuple("DIA_PROFISSAO", LocalDate.of(2026, 10, 25)),
                        org.assertj.core.groups.Tuple.tuple("DIA_PROFISSAO", LocalDate.of(2026, 10, 25)));
        DataEspecialDTO empresa = eventos.get(0);
        assertThat(empresa.getAnos()).isEqualTo(7);
        assertThat(empresa.getClienteNome()).isEqualTo("Sorriso");
        DataEspecialDTO dono = eventos.get(1);
        assertThat(dono.getPessoa()).isEqualTo("Dona Sorriso");
        assertThat(dono.getAnos()).as("idade do dono não é exposta").isNull();
        assertThat(dono.getTelefone()).isEqualTo("(85) 98888-7777");
        assertThat(eventos.get(2).getClienteId()).as("o dia da profissão em si vem antes dos clientes").isNull();
        assertThat(eventos.get(3).getProfissao()).isEqualTo("Dentista");
        assertThat(eventos.get(3).getClienteNome()).isEqualTo("Sorriso");
    }

    @Test
    void diaDaProfissaoApareceMesmoSemClienteCadastrado() {
        when(clienteRepository.findAllWithResponsavel()).thenReturn(List.of());

        List<DataEspecialDTO> eventos = service.eventosDoMes(2026, 8);

        assertThat(eventos).extracting(DataEspecialDTO::getTipo, DataEspecialDTO::getData, DataEspecialDTO::getProfissao)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("DIA_PROFISSAO", LocalDate.of(2026, 8, 27), "Psicólogo"));
        assertThat(eventos.get(0).getClienteId()).isNull();
        assertThat(eventos.get(0).getClienteNome()).isNull();
        assertThat(eventos.get(0).getTelefone()).isNull();
    }

    @Test
    void clienteForaDaAlcadaOuInativoNaoAparece() {
        Cliente meu = cliente(1L, "Meu");
        meu.setDataNascimentoResponsavel(LocalDate.of(1980, 10, 1));
        Cliente alheio = cliente(2L, "Alheio");
        alheio.setDataNascimentoResponsavel(LocalDate.of(1980, 10, 2));
        Cliente inativo = cliente(3L, "Inativo");
        inativo.setAtivo(false);
        inativo.setDataNascimentoResponsavel(LocalDate.of(1980, 10, 3));
        when(authorizationService.clienteIdsNaAlcada(usuario)).thenReturn(List.of(1L, 3L));
        when(clienteRepository.findAllWithResponsavel()).thenReturn(List.of(meu, alheio, inativo));

        assertThat(service.eventosDoMes(2026, 10)).extracting(DataEspecialDTO::getClienteId).containsExactly(1L, null);
    }

    @Test
    void nascidoEm29DeFevereiroComemoraEm28EmAnoNaoBissexto() {
        Cliente c = cliente(1L, "Bissexto");
        c.setDataNascimentoResponsavel(LocalDate.of(1988, 2, 29));
        when(clienteRepository.findAllWithResponsavel()).thenReturn(List.of(c));

        assertThat(service.eventosDoMes(2026, 2)).extracting(DataEspecialDTO::getData).containsExactly(LocalDate.of(2026, 2, 28));
        assertThat(service.eventosDoMes(2028, 2)).extracting(DataEspecialDTO::getData).containsExactly(LocalDate.of(2028, 2, 29));
    }

    @Test
    void profissaoInativaNaoGeraEvento() {
        dentista.setAtivo(false);
        Cliente c = cliente(1L, "Sorriso");
        c.setProfissaoId(3L);
        when(clienteRepository.findAllWithResponsavel()).thenReturn(List.of(c));

        assertThat(service.eventosDoMes(2026, 10)).isEmpty();
    }

    @Test
    void exigePermissaoDeVerClientes() {
        doThrow(new AcessoNegadoException("Sem permissão")).when(authorizationService)
                .requirePermission(br.com.someli.domain.PermissaoCodigo.CLIENTES_VISUALIZAR);

        assertThatThrownBy(() -> service.eventosDoMes(2026, 10)).isInstanceOf(AcessoNegadoException.class);
        verify(clienteRepository, never()).findAllWithResponsavel();
    }

    @Test
    void mesInvalido_400() {
        assertThatThrownBy(() -> service.eventosDoMes(2026, 13)).isInstanceOf(RegraNegocioException.class);
        assertThatThrownBy(() -> service.eventosDoMes(1800, 1)).isInstanceOf(RegraNegocioException.class);
    }

    @Test
    void notificaHojeQuemCuidaDoCliente_semDuplicar() {
        Usuario gerente = new Usuario();
        gerente.setId(10L);
        gerente.setAtivo(true);
        Usuario fiscal = new Usuario();
        fiscal.setId(11L);
        fiscal.setAtivo(true);
        Cliente c = cliente(1L, "Sorriso");
        c.setResponsavel(gerente);
        c.setDataNascimentoResponsavel(LocalDate.of(1985, 10, 20));
        ClienteResponsavel cr = new ClienteResponsavel();
        cr.setUsuario(fiscal);
        cr.setSetor("FISCAL");
        when(clienteRepository.findAllWithResponsavel()).thenReturn(List.of(c));
        when(clienteResponsavelRepository.findAtivosByClienteId(1L)).thenReturn(List.of(cr));
        when(notificationService.criarSeNaoExiste(any(), isNull(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new br.com.someli.domain.Notification());

        int criadas = service.notificarDia(LocalDate.of(2026, 10, 20));

        assertThat(criadas).isEqualTo(2);
        verify(notificationService).criarSeNaoExiste(eq(gerente), isNull(), eq("Aniversário: Dona Sorriso (Sorriso)"),
                any(), eq("normal"), eq("DATA_ESPECIAL"), eq("DATA:ANIVERSARIO_RESPONSAVEL:1:10:2026-10-20"), eq("/clientes/1"));
        verify(notificationService, times(1)).criarSeNaoExiste(eq(fiscal), isNull(), any(), any(), any(), any(),
                eq("DATA:ANIVERSARIO_RESPONSAVEL:1:11:2026-10-20"), any());
    }

    @Test
    void diaDaProfissaoSemClienteNaoGeraAvisoNoSino() {
        when(clienteRepository.findAllWithResponsavel()).thenReturn(List.of());

        assertThat(service.notificarDia(LocalDate.of(2026, 10, 25))).isZero();
        verify(notificationService, never()).criarSeNaoExiste(any(), any(), any(), any(), any(), any(), any(), any());
    }
}
