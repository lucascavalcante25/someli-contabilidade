package br.com.someli.repository;

import br.com.someli.domain.UsuarioPermissao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface UsuarioPermissaoRepository extends JpaRepository<UsuarioPermissao, Long> {

    @Query("""
            SELECT up FROM UsuarioPermissao up
            JOIN FETCH up.permissao
            WHERE up.usuario.id = :usuarioId
            """)
    List<UsuarioPermissao> findByUsuarioId(Long usuarioId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM UsuarioPermissao up WHERE up.usuario.id = :usuarioId")
    void deleteByUsuarioId(Long usuarioId);
}
