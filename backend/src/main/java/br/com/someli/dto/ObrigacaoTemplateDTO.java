package br.com.someli.dto;

import java.util.ArrayList;
import java.util.List;

public class ObrigacaoTemplateDTO {
    private Long id;
    private String codigo;
    private String nome;
    private String regime;
    private String descricao;
    private List<ObrigacaoTemplateItemDTO> itens = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getRegime() { return regime; }
    public void setRegime(String regime) { this.regime = regime; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public List<ObrigacaoTemplateItemDTO> getItens() { return itens; }
    public void setItens(List<ObrigacaoTemplateItemDTO> itens) { this.itens = itens != null ? itens : new ArrayList<>(); }
}
