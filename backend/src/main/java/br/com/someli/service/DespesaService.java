package br.com.someli.service;

import br.com.someli.domain.Despesa;
import br.com.someli.dto.CreateDespesaRequestDTO;
import br.com.someli.dto.DespesaDTO;
import br.com.someli.dto.UpdateDespesaRequestDTO;
import br.com.someli.repository.DespesaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class DespesaService {

    private final DespesaRepository despesaRepository;

    public DespesaService(DespesaRepository despesaRepository) {
        this.despesaRepository = despesaRepository;
    }

    public List<DespesaDTO> listarTodas() {
        return despesaRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<DespesaDTO> listarAtivas() {
        return despesaRepository.findByAtivoTrueOrderByDescricaoAsc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public DespesaDTO buscarPorId(Long id) {
        Despesa d = despesaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Despesa não encontrada"));
        return toDto(d);
    }

    @Transactional
    public DespesaDTO criar(CreateDespesaRequestDTO request) {
        Despesa d = new Despesa();
        d.setDescricao(request.getDescricao().trim());
        d.setValorMensal(request.getValorMensal());
        d.setTipo(request.getTipo());
        d.setDiaPagamento(request.getDiaPagamento() != null ? request.getDiaPagamento() : 10);
        d.setDataInicio(request.getDataInicio());
        d.setDataInicioCobranca(request.getDataInicioCobranca());
        d.setParcelas(request.getParcelas());
        d.setParcelaAtual(request.getParcelaAtual() != null ? request.getParcelaAtual() : 1);
        d.setAtivo(true);
        return toDto(despesaRepository.save(d));
    }

    @Transactional
    public DespesaDTO atualizar(Long id, UpdateDespesaRequestDTO request) {
        Despesa d = despesaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Despesa não encontrada"));
        if (request.getDescricao() != null) d.setDescricao(request.getDescricao().trim());
        if (request.getValorMensal() != null) d.setValorMensal(request.getValorMensal());
        if (request.getTipo() != null) d.setTipo(request.getTipo());
        if (request.getDiaPagamento() != null) d.setDiaPagamento(request.getDiaPagamento());
        if (request.getDataInicio() != null) d.setDataInicio(request.getDataInicio());
        if (request.getDataInicioCobranca() != null) d.setDataInicioCobranca(request.getDataInicioCobranca());
        if (request.getParcelas() != null) d.setParcelas(request.getParcelas());
        if (request.getParcelaAtual() != null) d.setParcelaAtual(request.getParcelaAtual());
        if (request.getAtivo() != null) d.setAtivo(request.getAtivo());
        return toDto(despesaRepository.save(d));
    }

    @Transactional
    public void remover(Long id) {
        despesaRepository.deleteById(id);
    }

    private DespesaDTO toDto(Despesa d) {
        DespesaDTO dto = new DespesaDTO();
        dto.setId(d.getId());
        dto.setDescricao(d.getDescricao());
        dto.setValorMensal(d.getValorMensal());
        dto.setTipo(d.getTipo());
        dto.setDiaPagamento(d.getDiaPagamento());
        dto.setDataInicio(d.getDataInicio());
        dto.setParcelas(d.getParcelas());
        dto.setParcelaAtual(d.getParcelaAtual());
        dto.setAtivo(d.getAtivo());
        dto.setDataInicioCobranca(d.getDataInicioCobranca());
        return dto;
    }
}
