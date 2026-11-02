package br.com.someli.repository;

import br.com.someli.domain.ClienteCertificadoArquivo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClienteCertificadoArquivoRepository extends JpaRepository<ClienteCertificadoArquivo, Long> {

    Optional<ClienteCertificadoArquivo> findByClienteId(Long clienteId);
}
