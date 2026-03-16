package br.com.someli.config;

import br.com.someli.domain.Perfil;
import br.com.someli.domain.Usuario;
import br.com.someli.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DatabaseInitializer {

    private static final Logger LOGGER = LoggerFactory.getLogger(DatabaseInitializer.class);

    @Bean
    CommandLineRunner createAdminUser(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        return args -> usuarioRepository.findByCpf("11111111111")
                .ifPresentOrElse(
                        usuario -> LOGGER.info("Usuario ADMIN ja existe com CPF {}", usuario.getCpf()),
                        () -> {
                            Usuario admin = new Usuario();
                            admin.setNome("Administrador");
                            admin.setCpf("11111111111");
                            admin.setEmail("admin@someli.com");
                            admin.setTelefone("(11) 99999-0000");
                            admin.setSenha(passwordEncoder.encode("adm@Someli"));
                            admin.setPerfil(Perfil.ADMIN);
                            admin.setAtivo(Boolean.TRUE);

                            usuarioRepository.save(admin);
                            LOGGER.info("Usuario ADMIN criado automaticamente com CPF 11111111111");
                        }
                );
    }
}
