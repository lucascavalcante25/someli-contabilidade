package br.com.someli.service;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Profissao;
import br.com.someli.dto.ProfissaoDTO;
import br.com.someli.dto.ProfissaoRequestDTO;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ProfissaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.MonthDay;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Lista de profissões e dias comemorativos. É um catálogo do escritório (não pertence a um cliente),
 * por isso não há alçada por empresa: ver exige CLIENTES_VISUALIZAR e alterar exige CLIENTES_EDITAR.
 */
@Service
public class ProfissaoService {

    private final ProfissaoRepository repository;
    private final AuthorizationService authorizationService;
    private final AuditLogService auditLogService;

    public ProfissaoService(ProfissaoRepository repository, AuthorizationService authorizationService,
                            AuditLogService auditLogService) {
        this.repository = repository;
        this.authorizationService = authorizationService;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<ProfissaoDTO> listar() {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_VISUALIZAR);
        return repository.findAll().stream()
                .sorted(Comparator.comparing(Profissao::getNome, String.CASE_INSENSITIVE_ORDER))
                .map(ProfissaoService::toDto)
                .toList();
    }

    @Transactional
    public ProfissaoDTO criar(ProfissaoRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        Profissao p = new Profissao();
        preencher(p, request, null);
        Profissao salva = repository.save(p);
        auditLogService.registrar("PROFISSAO_CRIAR", "PROFISSAO", String.valueOf(salva.getId()), null, salva.getNome());
        return toDto(salva);
    }

    @Transactional
    public ProfissaoDTO atualizar(Long id, ProfissaoRequestDTO request) {
        authorizationService.requirePermission(PermissaoCodigo.CLIENTES_EDITAR);
        Profissao p = repository.findById(id).orElseThrow(() -> new RegraNegocioException("Profissão não encontrada"));
        String antes = p.getNome() + " " + p.getDia() + "/" + p.getMes();
        preencher(p, request, id);
        Profissao salva = repository.save(p);
        auditLogService.registrar("PROFISSAO_ALTERAR", "PROFISSAO", String.valueOf(id), antes,
                salva.getNome() + " " + salva.getDia() + "/" + salva.getMes());
        return toDto(salva);
    }

    private void preencher(Profissao p, ProfissaoRequestDTO request, Long idAtual) {
        String nome = request.getNome() == null ? "" : request.getNome().trim();
        if (nome.isEmpty()) {
            throw new RegraNegocioException("Informe o nome da profissão");
        }
        try {
            // 29/02 vale (ano bissexto); 31/04 não existe
            MonthDay.of(request.getMes(), request.getDia());
        } catch (DateTimeException | NullPointerException e) {
            throw new RegraNegocioException("Essa data não existe");
        }
        repository.findByNomeIgnoreCase(nome)
                .filter(outra -> !outra.getId().equals(idAtual))
                .ifPresent(outra -> { throw new RegraNegocioException("Já existe a profissão " + nome); });
        p.setNome(nome);
        p.setDia(request.getDia());
        p.setMes(request.getMes());
        p.setCnaePrefixos(limparPrefixos(request.getCnaePrefixos()));
        if (request.getAtivo() != null) {
            p.setAtivo(request.getAtivo());
        }
    }

    /** " 96.02-5 , 9602 " → "96025,9602": só números, sem repetir. */
    static String limparPrefixos(String entrada) {
        if (entrada == null) return null;
        String limpo = Arrays.stream(entrada.split(","))
                .map(s -> s.replaceAll("\\D", ""))
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(Collectors.joining(","));
        return limpo.isEmpty() ? null : limpo;
    }

    static ProfissaoDTO toDto(Profissao p) {
        return new ProfissaoDTO(p.getId(), p.getNome(), p.getDia(), p.getMes(), p.getCnaePrefixos(),
                !Boolean.FALSE.equals(p.getAtivo()));
    }
}
