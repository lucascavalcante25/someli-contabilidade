package br.com.someli.service;

import br.com.someli.domain.AuditLog;
import br.com.someli.domain.Usuario;
import br.com.someli.repository.AuditLogRepository;
import br.com.someli.security.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final SecurityUtils securityUtils;

    public AuditLogService(AuditLogRepository auditLogRepository, SecurityUtils securityUtils) {
        this.auditLogRepository = auditLogRepository;
        this.securityUtils = securityUtils;
    }

    @Transactional
    public void registrar(String acao, String entidade, String entidadeId, String valorAnterior, String valorNovo) {
        AuditLog log = new AuditLog();
        Usuario u = securityUtils.currentUserOrNull();
        log.setUsuario(u);
        log.setAcao(acao);
        log.setEntidade(entidade);
        log.setEntidadeId(entidadeId);
        log.setValorAnterior(sanitize(valorAnterior));
        log.setValorNovo(sanitize(valorNovo));
        auditLogRepository.save(log);
    }

    private String sanitize(String value) {
        if (value == null) return null;
        String lower = value.toLowerCase();
        if (lower.contains("senha") || lower.contains("password") || lower.contains("token")) {
            return "[REDACTED]";
        }
        if (value.length() > 4000) {
            return value.substring(0, 4000);
        }
        return value;
    }
}
