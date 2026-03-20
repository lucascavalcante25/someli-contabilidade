package br.com.someli.repository;

import br.com.someli.domain.ClienteDocumento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClienteDocumentoRepository extends JpaRepository<ClienteDocumento, Long> {

    List<ClienteDocumento> findByClienteIdOrderByDataUploadDesc(Long clienteId);
}
