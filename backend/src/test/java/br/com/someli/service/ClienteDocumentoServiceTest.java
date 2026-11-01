package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteDocumento;
import br.com.someli.exception.AcessoNegadoException;
import br.com.someli.repository.ClienteDocumentoRepository;
import br.com.someli.repository.ClienteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClienteDocumentoServiceTest {

    @Mock private ClienteDocumentoRepository documentoRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private AuthorizationService authorizationService;

    @TempDir Path dir;

    private ClienteDocumentoService service;
    private ClienteDocumento documento;

    @BeforeEach
    void setUp() throws Exception {
        service = new ClienteDocumentoService(
                documentoRepository, clienteRepository, authorizationService, dir.toString());
        Files.writeString(dir.resolve("doc.txt"), "conteudo");

        Cliente cliente = new Cliente();
        cliente.setId(7L);
        documento = new ClienteDocumento();
        documento.setId(1L);
        documento.setCliente(cliente);
        documento.setUrlArquivo("doc.txt");
        when(documentoRepository.findById(1L)).thenReturn(Optional.of(documento));
    }

    @Test
    void obterArquivo_semAlcadaNoCliente_nega() {
        doThrow(new AcessoNegadoException("Sem alçada"))
                .when(authorizationService).requireCompanyAccess(7L);

        assertThatThrownBy(() -> service.obterArquivo(1L))
                .isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void obterArquivo_comAlcada_devolveArquivo() throws Exception {
        assertThat(service.obterArquivo(1L).exists()).isTrue();
    }
}
