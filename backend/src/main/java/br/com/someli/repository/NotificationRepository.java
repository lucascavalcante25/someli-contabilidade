package br.com.someli.repository;

import br.com.someli.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByClienteObrigacaoIdOrderByDataCriacaoDesc(Long clienteObrigacaoId);

    @Query("""
            SELECT n FROM Notification n
            LEFT JOIN FETCH n.clienteObrigacao co
            LEFT JOIN FETCH co.cliente
            LEFT JOIN FETCH co.obrigacao
            LEFT JOIN FETCH n.ocorrencia
            WHERE n.lida = false
            ORDER BY n.dataCriacao DESC
            """)
    List<Notification> findByLidaFalseOrderByDataCriacaoDesc();

    @Query("""
            SELECT n FROM Notification n
            LEFT JOIN FETCH n.clienteObrigacao co
            LEFT JOIN FETCH co.cliente
            LEFT JOIN FETCH co.obrigacao
            LEFT JOIN FETCH n.ocorrencia
            WHERE n.usuario.id = :usuarioId AND n.lida = false
            ORDER BY n.dataCriacao DESC
            """)
    List<Notification> findByUsuarioIdAndLidaFalseOrderByDataCriacaoDesc(Long usuarioId);

    long countByLidaFalse();

    long countByUsuarioIdAndLidaFalse(Long usuarioId);

    boolean existsByUsuarioIdAndChaveDedup(Long usuarioId, String chaveDedup);

    @Query("SELECT COUNT(n) > 0 FROM Notification n WHERE n.clienteObrigacao.id = :clienteObrigacaoId AND n.dataCriacao >= :inicio AND n.dataCriacao < :fim")
    boolean existsByClienteObrigacaoIdAndDataCriacaoBetween(Long clienteObrigacaoId, LocalDateTime inicio, LocalDateTime fim);
}
