package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Tag;
import br.com.someli.dto.TagDTO;
import br.com.someli.dto.UpdateClienteTagsRequestDTO;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.TagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TagService {

    private final TagRepository tagRepository;
    private final ClienteRepository clienteRepository;
    private final AuthorizationService authorizationService;

    public TagService(TagRepository tagRepository,
                      ClienteRepository clienteRepository,
                      AuthorizationService authorizationService) {
        this.tagRepository = tagRepository;
        this.clienteRepository = clienteRepository;
        this.authorizationService = authorizationService;
    }

    @Transactional(readOnly = true)
    public List<TagDTO> listarTodas() {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        return tagRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TagDTO> listarPorCliente(Long clienteId) {
        authorizationService.requireCompanyAccess(clienteId);
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        Cliente c = clienteRepository.findByIdWithResponsavel(clienteId)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado"));
        return c.getTags().stream().map(this::toDto).toList();
    }

    @Transactional
    public List<TagDTO> substituirTagsDoCliente(Long clienteId, UpdateClienteTagsRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        authorizationService.requireCompanyAccess(clienteId);
        Cliente c = clienteRepository.findByIdWithResponsavel(clienteId)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado"));

        Set<Tag> novas = new HashSet<>();
        if (request != null && request.getTagIds() != null) {
            for (Long tagId : request.getTagIds()) {
                if (tagId == null) continue;
                Tag tag = tagRepository.findById(tagId)
                        .orElseThrow(() -> new RegraNegocioException("Tag não encontrada: " + tagId));
                novas.add(tag);
            }
        }
        c.setTags(novas);
        clienteRepository.save(c);
        return novas.stream().map(this::toDto).collect(Collectors.toList());
    }

    public TagDTO toDto(Tag tag) {
        return new TagDTO(tag.getId(), tag.getNome(), tag.getCor());
    }
}
