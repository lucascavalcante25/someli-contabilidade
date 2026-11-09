package br.com.someli.service;

import br.com.someli.domain.Obrigacao;
import br.com.someli.domain.PeriodicidadeObrigacao;
import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.TipoObrigacao;
import br.com.someli.dto.CreateObrigacaoRequestDTO;
import br.com.someli.dto.UpdateObrigacaoRequestDTO;
import br.com.someli.exception.ObrigacaoNaoEncontradaException;
import br.com.someli.exception.RegraNegocioException;
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
        aplicarVencimentoPadrao(obrigacao, request.getPeriodicidadePadrao(), request.getDiaVencimentoPadrao(),
                request.getMesVencimentoPadrao());
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
        if (request.getPeriodicidadePadrao() != null) {
            aplicarVencimentoPadrao(obrigacao, request.getPeriodicidadePadrao(), request.getDiaVencimentoPadrao(),
                    request.getMesVencimentoPadrao());
        }
        return obrigacaoRepository.save(obrigacao);
    }

    private static final java.util.Set<String> PERIODICIDADES = java.util.Set.of(
            PeriodicidadeObrigacao.UNICA, PeriodicidadeObrigacao.MENSAL, PeriodicidadeObrigacao.TRIMESTRAL,
            PeriodicidadeObrigacao.SEMESTRAL, PeriodicidadeObrigacao.ANUAL);

    /** Periodicidade e vencimento padrão do tipo. O mês só vale para as anuais. */
    static void aplicarVencimentoPadrao(Obrigacao obrigacao, String periodicidade, Integer dia, Integer mes) {
        if (periodicidade == null) return;
        String valor = periodicidade.trim().toUpperCase();
        if (!PERIODICIDADES.contains(valor)) {
            throw new RegraNegocioException("Periodicidade inválida");
        }
        if (dia != null && (dia < 1 || dia > 31)) {
            throw new RegraNegocioException("Dia do vencimento deve ser entre 1 e 31");
        }
        boolean anual = PeriodicidadeObrigacao.ANUAL.equals(valor);
        if (anual && mes != null && (mes < 1 || mes > 12)) {
            throw new RegraNegocioException("Mês do vencimento deve ser entre 1 e 12");
        }
        obrigacao.setPeriodicidadePadrao(valor);
        obrigacao.setDiaVencimentoPadrao(dia);
        obrigacao.setMesVencimentoPadrao(anual ? mes : null);
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
