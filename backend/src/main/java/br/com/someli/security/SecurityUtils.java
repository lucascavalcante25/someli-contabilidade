package br.com.someli.security;

import br.com.someli.domain.Usuario;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.repository.UsuarioRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    private final UsuarioRepository usuarioRepository;

    public SecurityUtils(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public String currentCpf() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }
        Object principal = auth.getPrincipal();
        return principal instanceof String ? (String) principal : String.valueOf(principal);
    }

    public Usuario requireCurrentUser() {
        String cpf = currentCpf();
        if (cpf == null || cpf.isBlank()) {
            throw new AcessoNegadoException("Usuário não autenticado");
        }
        return usuarioRepository.findByCpf(cpf)
                .orElseThrow(() -> new AcessoNegadoException("Usuário não autenticado"));
    }

    public Usuario currentUserOrNull() {
        String cpf = currentCpf();
        if (cpf == null || cpf.isBlank()) return null;
        return usuarioRepository.findByCpf(cpf).orElse(null);
    }
}
