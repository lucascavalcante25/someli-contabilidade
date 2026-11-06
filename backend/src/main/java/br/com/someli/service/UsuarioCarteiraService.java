package br.com.someli.service;

import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.ClienteResponsavel;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.SetorResponsabilidade;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.CarteiraSetorDTO;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.exception.UsuarioNaoEncontradoException;
import br.com.someli.repository.ClienteObrigacaoRepository;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Carteira de um usuário (clientes pelos quais responde, por setor) e transferência quando ele sai do escritório.
 * O vínculo antigo é encerrado (data fim) e um novo é aberto para o destino: o histórico fica guardado.
 */
@Service
public class UsuarioCarteiraService {

    private final ClienteResponsavelRepository responsavelRepository;
    private final ClienteObrigacaoRepository clienteObrigacaoRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;

    public UsuarioCarteiraService(ClienteResponsavelRepository responsavelRepository,
                                  ClienteObrigacaoRepository clienteObrigacaoRepository,
                                  ClienteRepository clienteRepository,
                                  UsuarioRepository usuarioRepository,
                                  AuthorizationService authorizationService,
                                  AuditLogService auditLogService) {
        this.responsavelRepository = responsavelRepository;
        this.clienteObrigacaoRepository = clienteObrigacaoRepository;
        this.clienteRepository = clienteRepository;
        this.usuarioRepository = usuarioRepository;
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<CarteiraSetorDTO> carteira(Long usuarioId) {
        authorizationService.requirePermission(PermissaoCodigo.USUARIOS_VISUALIZAR);
        Map<String, List<ClienteResponsavel>> porSetor = responsavelRepository.findAtivosByUsuarioId(usuarioId).stream()
                .collect(Collectors.groupingBy(ClienteResponsavel::getSetor, LinkedHashMap::new, Collectors.toList()));
        List<CarteiraSetorDTO> resultado = new ArrayList<>();
        for (String setor : SetorResponsabilidade.todos()) {
            List<ClienteResponsavel> vinculos = porSetor.get(setor);
            if (vinculos == null) continue;
            List<CarteiraSetorDTO.ClienteDaCarteira> clientes = vinculos.stream()
                    .map(cr -> new CarteiraSetorDTO.ClienteDaCarteira(cr.getCliente().getId(), nome(cr)))
                    .sorted(Comparator.comparing(CarteiraSetorDTO.ClienteDaCarteira::nome, String.CASE_INSENSITIVE_ORDER))
                    .toList();
            resultado.add(new CarteiraSetorDTO(setor, SetorResponsabilidade.label(setor), clientes));
        }
        return resultado;
    }

    /** Usado para impedir excluir/desativar alguém que ainda responde por clientes. */
    @Transactional(readOnly = true)
    public boolean temCarteira(Long usuarioId) {
        return !responsavelRepository.findAtivosByUsuarioId(usuarioId).isEmpty();
    }

    /**
     * @param destinos setor → usuário que assume. Todo setor da carteira precisa de destino.
     * @return quantos vínculos de cliente foram transferidos
     */
    @Transactional
    public int transferir(Long usuarioId, Map<String, Long> destinos) {
        authorizationService.requirePermission(PermissaoCodigo.USUARIOS_EDITAR);
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_RESPONSAVEIS_EDITAR);
        Map<String, Long> mapa = destinos == null ? Map.of() : destinos;

        List<ClienteResponsavel> vinculos = responsavelRepository.findAtivosByUsuarioId(usuarioId);
        Set<String> setoresSemDestino = vinculos.stream().map(ClienteResponsavel::getSetor)
                .filter(s -> mapa.get(s) == null).collect(Collectors.toCollection(java.util.TreeSet::new));
        if (!setoresSemDestino.isEmpty()) {
            throw new RegraNegocioException("Escolha quem assume os clientes de: "
                    + setoresSemDestino.stream().map(SetorResponsabilidade::label).collect(Collectors.joining(", ")));
        }

        Map<Long, Usuario> usuarios = new HashMap<>();
        for (Map.Entry<String, Long> e : mapa.entrySet()) {
            if (e.getValue() == null) continue;
            if (Arrays.stream(SetorResponsabilidade.todos()).noneMatch(e.getKey()::equals)) {
                throw new RegraNegocioException("Setor inválido: " + e.getKey());
            }
            if (e.getValue().equals(usuarioId)) {
                throw new RegraNegocioException("Escolha outra pessoa para assumir os clientes");
            }
            Usuario destino = usuarios.computeIfAbsent(e.getValue(), id -> usuarioRepository.findById(id)
                    .orElseThrow(() -> new UsuarioNaoEncontradoException("Funcionário não encontrado")));
            if (!Boolean.TRUE.equals(destino.getAtivo())) {
                throw new RegraNegocioException("Só é possível transferir para funcionários ativos");
            }
        }

        LocalDate hoje = LocalDate.now();
        int transferidos = 0;
        for (ClienteResponsavel antigo : vinculos) {
            Usuario destino = usuarios.get(mapa.get(antigo.getSetor()));
            antigo.setAtivo(false);
            antigo.setDataFim(hoje);
            responsavelRepository.save(antigo);
            Long clienteId = antigo.getCliente().getId();
            if (!responsavelRepository.existsByClienteIdAndUsuarioIdAndSetorAndAtivoTrue(clienteId, destino.getId(), antigo.getSetor())) {
                ClienteResponsavel novo = new ClienteResponsavel();
                novo.setCliente(antigo.getCliente());
                novo.setUsuario(destino);
                novo.setSetor(antigo.getSetor());
                novo.setAtivo(true);
                novo.setDataInicio(hoje);
                responsavelRepository.save(novo);
            }
            if (SetorResponsabilidade.GERENTE_CONTA.equals(antigo.getSetor())) {
                antigo.getCliente().setResponsavel(destino);
                clienteRepository.save(antigo.getCliente());
            }
            transferidos++;
        }

        // Obrigações em que ele era o responsável direto vão para quem assumiu o setor delas
        for (ClienteObrigacao co : clienteObrigacaoRepository.findByResponsavelIdAndAtivoTrue(usuarioId)) {
            co.setResponsavel(usuarios.get(mapa.get(co.resolverSetor())));
            clienteObrigacaoRepository.save(co);
        }

        auditLogService.registrar("CARTEIRA_TRANSFERIR", "USUARIO", String.valueOf(usuarioId),
                transferidos + " vínculo(s)", mapa.toString());
        return transferidos;
    }

    private static String nome(ClienteResponsavel cr) {
        String fantasia = cr.getCliente().getNomeFantasia();
        return fantasia != null && !fantasia.isBlank() ? fantasia : cr.getCliente().getRazaoSocial();
    }
}
