package br.com.someli.service;

import br.com.someli.domain.SetorResponsabilidade;
import br.com.someli.domain.Usuario;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.repository.ClienteResponsavelRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/** Quem não tem alçada global só vê o setor em que é responsável e os itens sem setor. */
@Component
public class FichaSetorGuard {

    private final AuthorizationService authorizationService;
    private final ClienteResponsavelRepository responsaveis;

    public FichaSetorGuard(AuthorizationService authorizationService, ClienteResponsavelRepository responsaveis) {
        this.authorizationService = authorizationService;
        this.responsaveis = responsaveis;
    }

    public void exigir(Long clienteId, String setor) {
        if (!visivel(clienteId, setor)) {
            throw new AcessoNegadoException("Sem alçada neste setor do cliente");
        }
    }

    public boolean visivel(Long clienteId, String setor) {
        Usuario usuario = authorizationService.currentUser();
        boolean global = authorizationService.hasAlcadaGlobal(usuario);
        return visivel(usuario, global, clienteId, setor, new java.util.HashMap<>());
    }

    public boolean visivel(Usuario usuario, boolean alcadaGlobal, Long clienteId, String setor, Map<Long, List<String>> cache) {
        if (alcadaGlobal) return true;
        if (setor == null || setor.isBlank()) return true;
        List<String> meus = cache.computeIfAbsent(clienteId,
                id -> responsaveis.findSetoresAtivos(id, usuario.getId()));
        if (meus.contains(SetorResponsabilidade.GERENTE_CONTA)) return true;
        return meus.contains(setor);
    }
}
