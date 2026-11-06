package br.com.someli.service;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.FichaContagemDTO;
import br.com.someli.dto.FichaItemSetor;
import br.com.someli.repository.ClienteAcessoRepository;
import br.com.someli.repository.ClienteAnotacaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class FichaContagemService {

    private final ClienteAcessoRepository acessoRepository;
    private final ClienteAnotacaoRepository anotacaoRepository;
    private final AuthorizationService authorizationService;
    private final FichaSetorGuard setorGuard;

    public FichaContagemService(ClienteAcessoRepository acessoRepository,
                                ClienteAnotacaoRepository anotacaoRepository,
                                AuthorizationService authorizationService,
                                FichaSetorGuard setorGuard) {
        this.acessoRepository = acessoRepository;
        this.anotacaoRepository = anotacaoRepository;
        this.authorizationService = authorizationService;
        this.setorGuard = setorGuard;
    }

    @Transactional(readOnly = true)
    public List<FichaContagemDTO> contagens() {
        Map<Long, Integer> acessos = authorizationService.hasPermission(PermissaoCodigo.CLIENTE_ACESSOS_VER)
                ? contar(acessoRepository.listarSetoresAtivos())
                : Map.of();
        Map<Long, Integer> anotacoes = authorizationService.hasPermission(PermissaoCodigo.CLIENTES_VISUALIZAR)
                ? contar(anotacaoRepository.listarSetoresAtivos())
                : Map.of();
        Set<Long> ids = new HashSet<>();
        ids.addAll(acessos.keySet());
        ids.addAll(anotacoes.keySet());
        return ids.stream()
                .map(id -> new FichaContagemDTO(id, acessos.getOrDefault(id, 0), anotacoes.getOrDefault(id, 0)))
                .toList();
    }

    private Map<Long, Integer> contar(List<FichaItemSetor> itens) {
        Usuario usuario = authorizationService.currentUser();
        boolean global = authorizationService.hasAlcadaGlobal(usuario);
        List<Long> alcada = authorizationService.clienteIdsNaAlcada(usuario);
        Map<Long, List<String>> cache = new HashMap<>();
        Map<Long, Integer> mapa = new HashMap<>();
        for (FichaItemSetor item : itens) {
            if (!global && (alcada == null || !alcada.contains(item.clienteId()))) continue;
            if (!setorGuard.visivel(usuario, global, item.clienteId(), item.setor(), cache)) continue;
            mapa.merge(item.clienteId(), 1, Integer::sum);
        }
        return mapa;
    }
}
