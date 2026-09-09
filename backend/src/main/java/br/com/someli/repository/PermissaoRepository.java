package br.com.someli.repository;

import br.com.someli.domain.Permissao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PermissaoRepository extends JpaRepository<Permissao, Long> {
    Optional<Permissao> findByCodigo(String codigo);
    List<Permissao> findAllByOrderByModuloAscCodigoAsc();
}
