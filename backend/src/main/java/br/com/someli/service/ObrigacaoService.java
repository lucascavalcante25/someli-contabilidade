package br.com.someli.service;

import br.com.someli.domain.Obrigacao;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.TipoObrigacao;
import br.com.someli.dto.CreateObrigacaoRequestDTO;
import br.com.someli.dto.UpdateObrigacaoRequestDTO;
import br.com.someli.exception.ObrigacaoNaoEncontradaException;
import br.com.someli.repository.ObrigacaoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class ObrigacaoService {

    private final ObrigacaoRepository obrigacaoRepository;
    private final AuthorizationService authorizationService;

    public ObrigacaoService(ObrigacaoRepository obrigacaoRepository,
                            AuthorizationService authorizationService) {
        this.obrigacaoRepository = obrigacaoRepository;
        this.authorizationService = authorizationService;
    }

    public List<Obrigacao> listarTodas() {
        return obrigacaoRepository.findAllByOrderByNomeAsc();
    }

    public Obrigacao buscarPorId(Long id) {
        return obrigacaoRepository.findById(id)
                .orElseThrow(() -> new ObrigacaoNaoEncontradaException("Obrigação não encontrada"));
    }

    public Obrigacao criar(CreateObrigacaoRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_TIPOS_GERENCIAR);
        Obrigacao obrigacao = new Obrigacao();
        obrigacao.setNome(request.getNome().trim());
        aplicarTipo(obrigacao, request.getTipo());
        obrigacao.setDescricao(trimOrNull(request.getDescricao()));
        obrigacao.setDiasAntecedenciaAlerta(request.getDiasAntecedenciaAlerta() != null ? request.getDiasAntecedenciaAlerta() : 7);
        obrigacao.setUrlPortal(trimOrNull(request.getUrlPortal()));
        return obrigacaoRepository.save(obrigacao);
    }

    public Obrigacao atualizar(Long id, UpdateObrigacaoRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_TIPOS_GERENCIAR);
        Obrigacao obrigacao = buscarPorId(id);
        if (request.getNome() != null) obrigacao.setNome(request.getNome().trim());
        if (request.getTipo() != null) aplicarTipo(obrigacao, request.getTipo());
        if (request.getDescricao() != null) obrigacao.setDescricao(trimOrNull(request.getDescricao()));
        if (request.getDiasAntecedenciaAlerta() != null) obrigacao.setDiasAntecedenciaAlerta(request.getDiasAntecedenciaAlerta());
        if (request.getUrlPortal() != null) obrigacao.setUrlPortal(trimOrNull(request.getUrlPortal()));
        return obrigacaoRepository.save(obrigacao);
    }

    public void remover(Long id) {
        authorizationService.requirePermission(PermissaoCodigo.OBRIGACOES_TIPOS_GERENCIAR);
        obrigacaoRepository.delete(buscarPorId(id));
    }

    /** O tipo define o setor que recebe as ocorrências (ex.: Pessoal vai para o Departamento Pessoal). */
    private void aplicarTipo(Obrigacao obrigacao, String tipo) {
        String normalizado = TipoObrigacao.normalizar(tipo);
        obrigacao.setTipo(normalizado);
        obrigacao.setSetor(TipoObrigacao.setor(normalizado));
    }

    private String trimOrNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
