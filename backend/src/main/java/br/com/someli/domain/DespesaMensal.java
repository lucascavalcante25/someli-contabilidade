package br.com.someli.domain;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "despesa_mensal", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"despesa_id", "mes", "ano"})
})
public class DespesaMensal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "despesa_id", nullable = false)
    private Long despesaId;

    @Column(nullable = false)
    private Integer mes;

    @Column(nullable = false)
    private Integer ano;

    @Column(nullable = false)
    private Boolean paga = Boolean.FALSE;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDespesaId() { return despesaId; }
    public void setDespesaId(Long despesaId) { this.despesaId = despesaId; }
    public Integer getMes() { return mes; }
    public void setMes(Integer mes) { this.mes = mes; }
    public Integer getAno() { return ano; }
    public void setAno(Integer ano) { this.ano = ano; }
    public Boolean getPaga() { return paga; }
    public void setPaga(Boolean paga) { this.paga = paga; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        DespesaMensal that = (DespesaMensal) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
