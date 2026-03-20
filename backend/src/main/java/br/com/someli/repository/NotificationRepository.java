package br.com.someli.repository;

import br.com.someli.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByClienteObrigacaoIdOrderByDataCriacaoDesc(Long clienteObrigacaoId);

    @Query("SELECT n FROM Notification n JOIN FETCH n.clienteObrigacao co JOIN FETCH co.cliente JOIN FETCH co.obrigacao WHERE n.lida = false ORDER BY n.dataCriacao DESC")
    List<Notification> findByLidaFalseOrderByDataCriacaoDesc();

    long countByLidaFalse();

    @Query("SELECT COUNT(n) > 0 FROM Notification n WHERE n.clienteObrigacao.id = :clienteObrigacaoId AND n.dataCriacao >= :inicio AND n.dataCriacao < :fim")
    boolean existsByClienteObrigacaoIdAndDataCriacaoBetween(Long clienteObrigacaoId, LocalDateTime inicio, LocalDateTime fim);
}
