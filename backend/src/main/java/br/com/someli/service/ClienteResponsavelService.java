package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteResponsavel;
import br.com.someli.domain.SetorResponsabilidade;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.ClienteResponsavelDTO;
import br.com.someli.dto.UpsertClienteResponsavelRequestDTO;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.exception.UsuarioNaoEncontradoException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.ClienteResponsavelRepository;
import br.com.someli.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class ClienteResponsavelService {

    private final ClienteResponsavelRepository repository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;

    public ClienteResponsavelService(ClienteResponsavelRepository repository,
                                     ClienteRepository clienteRepository,
                                     UsuarioRepository usuarioRepository,
                                     AuthorizationService authorizationService,
                                     AuditLogService auditLogService) {
        this.repository = repository;
        this.clienteRepository = clienteRepository;
        this.usuarioRepository = usuarioRepository;
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<ClienteResponsavelDTO> listarPorCliente(Long clienteId) {
        authorizationService.requireCompanyAccess(clienteId);
        return repository.findAtivosByClienteId(clienteId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ClienteResponsavelDTO> resumoPorCliente(Long clienteId) {
        authorizationService.requireCompanyAccess(clienteId);
        List<ClienteResponsavel> ativos = repository.findAtivosByClienteId(clienteId);
        List<ClienteResponsavelDTO> result = new ArrayList<>();
        for (String setor : SetorResponsabilidade.todos()) {
            Optional<ClienteResponsavel> found = ativos.stream()
                    .filter(cr -> setor.equals(cr.getSetor()))
                    .findFirst();
            ClienteResponsavelDTO dto = new ClienteResponsavelDTO();
            dto.setClienteId(clienteId);
            dto.setSetor(setor);
            dto.setSetorLabel(SetorResponsabilidade.label(setor));
            dto.setAtivo(true);
            found.ifPresent(cr -> {
                dto.setId(cr.getId());
                dto.setUsuarioId(cr.getUsuario().getId());
                dto.setUsuarioNome(cr.getUsuario().getNome());
                dto.setDataInicio(cr.getDataInicio());
                dto.setDataFim(cr.getDataFim());
            });
            result.add(dto);
        }
        return result;
    }

    @Transactional
    public ClienteResponsavelDTO definir(Long clienteId, UpsertClienteResponsavelRequestDTO request) {
        authorizationService.requirePermission(br.com.someli.domain.PermissaoCodigo.CLIENTES_RESPONSAVEIS_EDITAR);
        authorizationService.requireCompanyAccess(clienteId);

        if (request.getSetor() == null || Arrays.stream(SetorResponsabilidade.todos()).noneMatch(s -> s.equals(request.getSetor()))) {
            throw new RegraNegocioException("Setor inválido");
        }

        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado"));

        Optional<ClienteResponsavel> atualOpt = repository.findByClienteIdAndSetorAndAtivoTrue(clienteId, request.getSetor());

        if (request.getUsuarioId() == null) {
            atualOpt.ifPresent(atual -> {
                atual.setAtivo(false);
                atual.setDataFim(LocalDate.now());
                repository.save(atual);
                if (SetorResponsabilidade.GERENTE_CONTA.equals(request.getSetor())) {
                    cliente.setResponsavel(null);
                    clienteRepository.save(cliente);
                }
                auditLogService.registrar("RESPONSAVEL_REMOVER", "CLIENTE", String.valueOf(clienteId),
                        request.getSetor() + "=" + atual.getUsuario().getId(), null);
            });
            ClienteResponsavelDTO vazio = new ClienteResponsavelDTO();
            vazio.setClienteId(clienteId);
            vazio.setSetor(request.getSetor());
            vazio.setSetorLabel(SetorResponsabilidade.label(request.getSetor()));
            return vazio;
        }

        Usuario usuario = usuarioRepository.findById(request.getUsuarioId())
                .orElseThrow(() -> new UsuarioNaoEncontradoException("Funcionário não encontrado"));
        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            throw new RegraNegocioException("Só é possível atribuir funcionários ativos");
        }

        String anterior = atualOpt.map(a -> String.valueOf(a.getUsuario().getId())).orElse(null);

        if (atualOpt.isPresent() && atualOpt.get().getUsuario().getId().equals(usuario.getId())) {
            return toDto(atualOpt.get());
        }

        atualOpt.ifPresent(atual -> {
            atual.setAtivo(false);
            atual.setDataFim(LocalDate.now());
            repository.save(atual);
        });

        ClienteResponsavel novo = new ClienteResponsavel();
        novo.setCliente(cliente);
        novo.setUsuario(usuario);
        novo.setSetor(request.getSetor());
        novo.setAtivo(true);
        novo.setDataInicio(request.getDataInicio() != null ? request.getDataInicio() : LocalDate.now());
        novo = repository.save(novo);

        if (SetorResponsabilidade.GERENTE_CONTA.equals(request.getSetor())) {
            cliente.setResponsavel(usuario);
            clienteRepository.save(cliente);
        }

        auditLogService.registrar("RESPONSAVEL_ALTERAR", "CLIENTE", String.valueOf(clienteId),
                request.getSetor() + "=" + anterior,
                request.getSetor() + "=" + usuario.getId());

        return toDto(novo);
    }

    private ClienteResponsavelDTO toDto(ClienteResponsavel cr) {
        ClienteResponsavelDTO dto = new ClienteResponsavelDTO();
        dto.setId(cr.getId());
        dto.setClienteId(cr.getCliente().getId());
        dto.setUsuarioId(cr.getUsuario().getId());
        dto.setUsuarioNome(cr.getUsuario().getNome());
        dto.setSetor(cr.getSetor());
        dto.setSetorLabel(SetorResponsabilidade.label(cr.getSetor()));
        dto.setAtivo(cr.getAtivo());
        dto.setDataInicio(cr.getDataInicio());
        dto.setDataFim(cr.getDataFim());
        return dto;
    }
}
