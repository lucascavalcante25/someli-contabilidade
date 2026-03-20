package br.com.someli.controller;

import br.com.someli.dto.NotificationDTO;
import br.com.someli.mapper.NotificationMapper;
import br.com.someli.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationMapper notificationMapper;

    public NotificationController(NotificationService notificationService, NotificationMapper notificationMapper) {
        this.notificationService = notificationService;
        this.notificationMapper = notificationMapper;
    }

    @GetMapping
    public ResponseEntity<List<NotificationDTO>> listarNaoLidas() {
        return ResponseEntity.ok(
                notificationService.listarNaoLidas().stream()
                        .map(notificationMapper::toDto)
                        .toList()
        );
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> contarNaoLidas() {
        return ResponseEntity.ok(Map.of("count", notificationService.contarNaoLidas()));
    }

    @PutMapping("/{id}/lida")
    public ResponseEntity<NotificationDTO> marcarComoLida(@PathVariable Long id) {
        return ResponseEntity.ok(notificationMapper.toDto(notificationService.marcarComoLida(id)));
    }
}
