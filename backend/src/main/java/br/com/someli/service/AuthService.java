package br.com.someli.service;

import br.com.someli.domain.Usuario;
import br.com.someli.dto.LoginRequestDTO;
import br.com.someli.dto.LoginResponseDTO;
import br.com.someli.exception.SenhaInvalidaException;
import br.com.someli.mapper.UsuarioMapper;
import br.com.someli.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuthService.class);

    private final UsuarioService usuarioService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UsuarioMapper usuarioMapper;

    public AuthService(
            UsuarioService usuarioService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            UsuarioMapper usuarioMapper
    ) {
        this.usuarioService = usuarioService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.usuarioMapper = usuarioMapper;
    }

    public LoginResponseDTO login(LoginRequestDTO request) {
        String cpfNormalizado = request.getCpf() != null ? request.getCpf().replaceAll("\\D", "") : "";
        Usuario usuario = usuarioService.buscarPorCpf(cpfNormalizado);

        String senhaHash = usuario.getSenha();
        if (senhaHash == null) {
            LOGGER.warn("Usuario {} sem senha cadastrada", usuario.getCpf());
            throw new SenhaInvalidaException("Senha invalida");
        }
        if (!passwordEncoder.matches(request.getSenha(), senhaHash)) {
            LOGGER.warn("Login invalido para CPF {}", cpfNormalizado);
            throw new SenhaInvalidaException("Senha invalida");
        }

        String token = jwtService.gerarToken(usuario);
        LOGGER.info("Login realizado com sucesso para CPF {}", cpfNormalizado);
        return new LoginResponseDTO(token, usuarioMapper.toDto(usuario));
    }
}
