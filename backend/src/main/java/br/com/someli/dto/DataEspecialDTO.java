package br.com.someli.dto;

import java.time.LocalDate;

/**
 * Um acontecimento no calendário do mês: aniversário do dono (ANIVERSARIO_RESPONSAVEL),
 * da empresa (ANIVERSARIO_EMPRESA, com os anos de empresa) ou dia da profissão (DIA_PROFISSAO).
 */
public class DataEspecialDTO {
    private LocalDate data;
    private String tipo;
    private Long clienteId;
    private String clienteNome;
    /** Nome do dono/responsável legal. */
    private String pessoa;
    private String profissao;
    /** Só no aniversário da empresa (a idade do dono não é exposta). */
    private Integer anos;
    /** Telefone/WhatsApp do responsável, para o botão de parabéns. */
    private String telefone;

    public LocalDate getData() { return data; }
    public void setData(LocalDate data) { this.data = data; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public String getClienteNome() { return clienteNome; }
    public void setClienteNome(String clienteNome) { this.clienteNome = clienteNome; }
    public String getPessoa() { return pessoa; }
    public void setPessoa(String pessoa) { this.pessoa = pessoa; }
    public String getProfissao() { return profissao; }
    public void setProfissao(String profissao) { this.profissao = profissao; }
    public Integer getAnos() { return anos; }
    public void setAnos(Integer anos) { this.anos = anos; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
}
