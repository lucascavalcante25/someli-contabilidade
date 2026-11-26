package br.com.someli.domain;

/**
 * Qual das duas calculadoras oficiais da Receita (CBS/IBS/IS, LC 214/2025) atende a simulação.
 * Cada uma roda como serviço próprio; ver docs/CALCULADORA_RTC.md.
 */
public enum RegimeRtc {
    /** calculadora-rtc-regime-regular: regime regular (geral) do IBS e da CBS, com Imposto Seletivo. */
    REGIME_REGULAR,
    /** calculadora-rtc-simples-nacional: IBS e CBS recolhidos pelo Simples Nacional. */
    SIMPLES_NACIONAL
}
