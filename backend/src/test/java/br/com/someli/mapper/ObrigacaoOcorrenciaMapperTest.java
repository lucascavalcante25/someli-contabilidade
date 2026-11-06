package br.com.someli.mapper;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.Obrigacao;
import br.com.someli.domain.ObrigacaoOcorrencia;
import br.com.someli.dto.ObrigacaoOcorrenciaDTO;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ObrigacaoOcorrenciaMapperTest {

    private ObrigacaoOcorrencia ocorrencia(String razao, String fantasia) {
        Cliente c = new Cliente();
        c.setId(1L);
        c.setRazaoSocial(razao);
        c.setNomeFantasia(fantasia);
        ClienteObrigacao co = new ClienteObrigacao();
        co.setCliente(c);
        co.setObrigacao(new Obrigacao());
        ObrigacaoOcorrencia oo = new ObrigacaoOcorrencia();
        oo.setClienteObrigacao(co);
        return oo;
    }

    @Test
    void levaONomeFantasiaParaOPainel() {
        ObrigacaoOcorrenciaDTO dto = ObrigacaoOcorrenciaMapper.toDto(ocorrencia("21.835.649 JOSE ALIGHIELDE", "Eudinho"));
        assertThat(dto.getClienteNomeFantasia()).isEqualTo("Eudinho");
        assertThat(dto.getClienteNome()).isEqualTo("21.835.649 JOSE ALIGHIELDE");
    }

    @Test
    void semNomeFantasiaUsaARazaoSocial() {
        assertThat(ObrigacaoOcorrenciaMapper.toDto(ocorrencia("FRA CARNES", " ")).getClienteNomeFantasia()).isEqualTo("FRA CARNES");
    }
}
