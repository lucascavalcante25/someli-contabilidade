package br.com.someli.service;

import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.Notification;
import br.com.someli.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<Notification> listarPorClienteObrigacao(Long clienteObrigacaoId) {
        return notificationRepository.findByClienteObrigacaoIdOrderByDataCriacaoDesc(clienteObrigacaoId);
    }

    @Transactional(readOnly = true)
    public List<Notification> listarNaoLidas() {
        return notificationRepository.findByLidaFalseOrderByDataCriacaoDesc();
    }

    public long contarNaoLidas() {
        return notificationRepository.countByLidaFalse();
    }

    public Notification marcarComoLida(Long id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notificação não encontrada"));
        n.setLida(true);
        return notificationRepository.save(n);
    }

    public Notification criar(ClienteObrigacao clienteObrigacao, String titulo, String descricao, String prioridade) {
        Notification n = new Notification();
        n.setClienteObrigacao(clienteObrigacao);
        n.setTitulo(titulo);
        n.setDescricao(descricao);
        n.setPrioridade(prioridade != null ? prioridade : "normal");
        return notificationRepository.save(n);
    }
}
