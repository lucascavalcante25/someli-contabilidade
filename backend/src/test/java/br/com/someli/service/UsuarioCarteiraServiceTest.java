package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.ClienteResponsavel;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.CarteiraSetorDTO;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UsuarioCarteiraServiceTest {

    @Mock ClienteResponsavelRepository responsavelRepository;
    @Mock ClienteObrigacaoRepository clienteObrigacaoRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock AuthorizationService authorizationService;
    @Mock AuditLogService auditLogService;

    UsuarioCarteiraService service;
    Usuario karol, ana, inativo;
    Cliente fra, timbu;

    @BeforeEach
    void setUp() {
        service = new UsuarioCarteiraService(responsavelRepository, clienteObrigacaoRepository, clienteRepository,
                usuarioRepository, authorizationService, auditLogService);
        karol = usuario(5L, "Karol", true);
        ana = usuario(6L, "Ana", true);
        inativo = usuario(7L, "Antigo", false);
        fra = cliente(30L, "Fra Carnes");
        timbu = cliente(12L, "Açai Timbu");
        lenient().when(usuarioRepository.findById(5L)).thenReturn(Optional.of(karol));
        lenient().when(usuarioRepository.findById(6L)).thenReturn(Optional.of(ana));
        lenient().when(usuarioRepository.findById(7L)).thenReturn(Optional.of(inativo));
        lenient().when(responsavelRepository.save(any(ClienteResponsavel.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static Usuario usuario(long id, String nome, boolean ativo) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setNome(nome);
        u.setAtivo(ativo);
        return u;
    }

    private static Cliente cliente(long id, String nome) {
        Cliente c = new Cliente();
        c.setId(id);
        c.setNomeFantasia(nome);
        c.setRazaoSocial(nome.toUpperCase());
        return c;
    }

    private ClienteResponsavel vinculo(Cliente c, Usuario u, String setor) {
        ClienteResponsavel cr = new ClienteResponsavel();
        cr.setCliente(c);
        cr.setUsuario(u);
        cr.setSetor(setor);
        cr.setAtivo(true);
        cr.setDataInicio(LocalDate.of(2026, 1, 1));
        return cr;
    }

    @Test
    void carteira_agrupaClientesPorSetor() {
        when(responsavelRepository.findAtivosByUsuarioId(5L)).thenReturn(List.of(
                vinculo(fra, karol, "FISCAL"), vinculo(timbu, karol, "FISCAL"), vinculo(fra, karol, "DEPARTAMENTO_PESSOAL")));

        List<CarteiraSetorDTO> carteira = service.carteira(5L);

        assertThat(carteira).extracting(CarteiraSetorDTO::setor).containsExactly("FISCAL", "DEPARTAMENTO_PESSOAL");
        assertThat(carteira.get(0).clientes()).extracting(CarteiraSetorDTO.ClienteDaCarteira::nome)
                .containsExactly("Açai Timbu", "Fra Carnes");
        verify(authorizationService).requirePermission(PermissaoCodigo.USUARIOS_VISUALIZAR);
    }

    @Test
    void transferir_passaCadaSetorParaODestinoEGuardaHistorico() {
        ClienteResponsavel fiscalFra = vinculo(fra, karol, "FISCAL");
        when(responsavelRepository.findAtivosByUsuarioId(5L)).thenReturn(List.of(fiscalFra));

        int transferidos = service.transferir(5L, Map.of("FISCAL", 6L));

        assertThat(transferidos).isEqualTo(1);
        assertThat(fiscalFra.getAtivo()).isFalse();
        assertThat(fiscalFra.getDataFim()).isEqualTo(LocalDate.now());
        ArgumentCaptor<ClienteResponsavel> salvos = ArgumentCaptor.forClass(ClienteResponsavel.class);
        verify(responsavelRepository, atLeastOnce()).save(salvos.capture());
        ClienteResponsavel novo = salvos.getAllValues().stream().filter(c -> c.getUsuario() == ana).findFirst().orElseThrow();
        assertThat(novo.getAtivo()).isTrue();
        assertThat(novo.getSetor()).isEqualTo("FISCAL");
        assertThat(novo.getCliente()).isSameAs(fra);
        verify(auditLogService).registrar(any(), any(), any(), any(), any());
    }

    @Test
    void transferir_levaTambemOResponsavelDasObrigacoes() {
        when(responsavelRepository.findAtivosByUsuarioId(5L)).thenReturn(List.of());
        ClienteObrigacao das = new ClienteObrigacao();
        das.setResponsavel(karol);
        das.setSetor("FISCAL");
        when(clienteObrigacaoRepository.findByResponsavelIdAndAtivoTrue(5L)).thenReturn(List.of(das));

        service.transferir(5L, Map.of("FISCAL", 6L));

        assertThat(das.getResponsavel()).isSameAs(ana);
    }

    @Test
    void transferir_semDestinoParaUmSetorDaCarteira_recusa() {
        when(responsavelRepository.findAtivosByUsuarioId(5L)).thenReturn(List.of(
                vinculo(fra, karol, "FISCAL"), vinculo(fra, karol, "CONTABIL")));

        assertThatThrownBy(() -> service.transferir(5L, Map.of("FISCAL", 6L)))
                .isInstanceOf(RegraNegocioException.class).hasMessageContaining("Contábil");
        verify(responsavelRepository, never()).save(any());
    }

    @Test
    void transferir_paraUsuarioInativoOuOProprio_recusa() {
        when(responsavelRepository.findAtivosByUsuarioId(5L)).thenReturn(List.of(vinculo(fra, karol, "FISCAL")));

        assertThatThrownBy(() -> service.transferir(5L, Map.of("FISCAL", 7L))).isInstanceOf(RegraNegocioException.class);
        assertThatThrownBy(() -> service.transferir(5L, Map.of("FISCAL", 5L))).isInstanceOf(RegraNegocioException.class);
        verify(responsavelRepository, never()).save(any());
    }

    @Test
    void transferir_semPermissao_nega() {
        lenient().doThrow(new AcessoNegadoException("Sem permissão"))
                .when(authorizationService).requirePermission(PermissaoCodigo.CLIENTES_RESPONSAVEIS_EDITAR);

        assertThatThrownBy(() -> service.transferir(5L, Map.of("FISCAL", 6L))).isInstanceOf(AcessoNegadoException.class);
        verify(responsavelRepository, never()).save(any());
    }
}
