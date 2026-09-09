package br.com.someli.repository;

import br.com.someli.domain.PerfilPermissao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PerfilPermissaoRepository extends JpaRepository<PerfilPermissao, Long> {

    @Query("""
            SELECT pp FROM PerfilPermissao pp
            JOIN FETCH pp.permissao
            WHERE pp.perfil = :perfil
            """)
    List<PerfilPermissao> findByPerfil(String perfil);
}
