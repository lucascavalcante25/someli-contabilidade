package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteObrigacao;
import br.com.someli.domain.Obrigacao;
import br.com.someli.domain.ObrigacaoOcorrencia;
import br.com.someli.dto.CreateObrigacaoRequestDTO;
import br.com.someli.dto.UpdateObrigacaoRequestDTO;
import br.com.someli.mapper.ObrigacaoOcorrenciaMapper;
import br.com.someli.repository.ObrigacaoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ObrigacaoServiceTest {

    @Mock ObrigacaoRepository repository;
    ObrigacaoService service;

    @BeforeEach
    void setUp() {
        service = new ObrigacaoService(repository);
    }

    @Test
    void criar_persisteUrlPortal() {
        when(repository.save(any(Obrigacao.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateObrigacaoRequestDTO req = new CreateObrigacaoRequestDTO();
        req.setNome("eSocial");
        req.setTipo("FISCAL");
        req.setDiasAntecedenciaAlerta(7);
        req.setUrlPortal("https://login.esocial.gov.br/login.aspx");

        Obrigacao saved = service.criar(req);

        assertEquals("https://login.esocial.gov.br/login.aspx", saved.getUrlPortal());
        ArgumentCaptor<Obrigacao> cap = ArgumentCaptor.forClass(Obrigacao.class);
        verify(repository).save(cap.capture());
        assertEquals("https://login.esocial.gov.br/login.aspx", cap.getValue().getUrlPortal());
    }

    @Test
    void atualizar_persisteUrlPortal() {
        Obrigacao existente = new Obrigacao();
        existente.setId(1L);
        existente.setNome("PGDAS-D");
        existente.setTipo("FISCAL");
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(any(Obrigacao.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateObrigacaoRequestDTO req = new UpdateObrigacaoRequestDTO();
        req.setUrlPortal("https://www8.receita.fazenda.gov.br/SimplesNacional/");

        Obrigacao saved = service.atualizar(1L, req);
        assertEquals("https://www8.receita.fazenda.gov.br/SimplesNacional/", saved.getUrlPortal());
    }

    @Test
    void ocorrenciaDto_expoeUrlPortalDaObrigacao() {
        Obrigacao ob = new Obrigacao();
        ob.setId(9L);
        ob.setNome("eSocial");
        ob.setUrlPortal("https://login.esocial.gov.br/login.aspx");

        Cliente cliente = new Cliente();
        cliente.setId(5L);
        cliente.setRazaoSocial("ABC Tecnologia Ltda");

        ClienteObrigacao co = new ClienteObrigacao();
        co.setId(2L);
        co.setCliente(cliente);
        co.setObrigacao(ob);
        co.setSetor("DEPARTAMENTO_PESSOAL");

        ObrigacaoOcorrencia oo = new ObrigacaoOcorrencia();
        oo.setId(3L);
        oo.setClienteObrigacao(co);
        oo.setStatus("PENDENTE");

        var dto = ObrigacaoOcorrenciaMapper.toDto(oo);
        assertEquals("https://login.esocial.gov.br/login.aspx", dto.getUrlPortal());
        assertEquals(9L, dto.getObrigacaoId());
        assertEquals("DEPARTAMENTO_PESSOAL", dto.getSetor());
    }
}
