package br.com.someli.domain;

/**
 * Perfis de acesso. Permissões reais vêm de perfil_permissao + exceções do usuário.
 * ADMIN/CONTADOR/OPERADOR mantidos por compatibilidade.
 */
public enum Perfil {
    ADMIN,
    SOCIO,
    GERENTE,
    SUPERVISOR_FISCAL,
    FISCAL,
    SUPERVISOR_DP,
    DEPARTAMENTO_PESSOAL,
    CONTABIL,
    FINANCEIRO,
    ATENDIMENTO,
    ESTAGIARIO,
    CONTADOR,
    OPERADOR,
    /** Reservado para portal do cliente — nunca herda permissões internas. */
    CLIENTE
}
