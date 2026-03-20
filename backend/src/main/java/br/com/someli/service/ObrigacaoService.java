package br.com.someli.service;

import br.com.someli.domain.Obrigacao;
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

    public ObrigacaoService(ObrigacaoRepository obrigacaoRepository) {
        this.obrigacaoRepository = obrigacaoRepository;
    }

    public List<Obrigacao> listarTodas() {
        return obrigacaoRepository.findAllByOrderByNomeAsc();
    }

    public Obrigacao buscarPorId(Long id) {
        return obrigacaoRepository.findById(id)
                .orElseThrow(() -> new ObrigacaoNaoEncontradaException("Obrigação não encontrada"));
    }

    public Obrigacao criar(CreateObrigacaoRequestDTO request) {
        Obrigacao obrigacao = new Obrigacao();
        obrigacao.setNome(request.getNome().trim());
        obrigacao.setTipo(request.getTipo());
        obrigacao.setDescricao(trimOrNull(request.getDescricao()));
        obrigacao.setDiasAntecedenciaAlerta(request.getDiasAntecedenciaAlerta() != null ? request.getDiasAntecedenciaAlerta() : 7);
        return obrigacaoRepository.save(obrigacao);
    }

    public Obrigacao atualizar(Long id, UpdateObrigacaoRequestDTO request) {
        Obrigacao obrigacao = buscarPorId(id);
        if (request.getNome() != null) obrigacao.setNome(request.getNome().trim());
        if (request.getTipo() != null) obrigacao.setTipo(request.getTipo());
        if (request.getDescricao() != null) obrigacao.setDescricao(trimOrNull(request.getDescricao()));
        if (request.getDiasAntecedenciaAlerta() != null) obrigacao.setDiasAntecedenciaAlerta(request.getDiasAntecedenciaAlerta());
        return obrigacaoRepository.save(obrigacao);
    }

    public void remover(Long id) {
        obrigacaoRepository.delete(buscarPorId(id));
    }

    private String trimOrNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
