package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.ClienteDocumento;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteDocumentoRepository;
import br.com.someli.repository.ClienteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ClienteDocumentoServiceTiposTest {

    @Mock private ClienteDocumentoRepository documentoRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private AuthorizationService authorizationService;
    @TempDir Path pasta;

    private ClienteDocumentoService service;

    @BeforeEach
    void setUp() {
        service = new ClienteDocumentoService(documentoRepository, clienteRepository, authorizationService,
                pasta.toString());
        Cliente cliente = new Cliente();
        cliente.setId(3L);
        lenient().when(clienteRepository.findById(3L)).thenReturn(Optional.of(cliente));
        lenient().when(documentoRepository.save(any(ClienteDocumento.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @ParameterizedTest
    @CsvSource({
            "extrato.ofx, application/x-ofx",
            "EXTRATO.OFX, application/x-ofx",
            "planilha.xls, application/vnd.ms-excel",
            "planilha.xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "planilha.ods, application/vnd.oasis.opendocument.spreadsheet",
            "texto.odt, application/vnd.oasis.opendocument.text",
            "texto.doc, application/msword",
            "texto.docx, application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "nota.pdf, application/pdf",
            "lancamentos.csv, text/csv",
            "extrato.txt, text/plain",
            "foto.jpeg, image/jpeg",
            "foto.webp, image/webp",
            "nota.xml, application/xml",
    })
    void tiposAceitos(String nome, String tipo) {
        assertThat(ClienteDocumentoService.tipoPermitido(nome)).isEqualTo(tipo);
    }

    @Test
    void todoTipoPermitidoCabeNaColunaDoBanco() throws Exception {
        int tamanho = ClienteDocumento.class.getDeclaredField("tipoArquivo")
                .getAnnotation(jakarta.persistence.Column.class).length();
        for (String nome : new String[]{"a.xlsx", "a.docx", "a.ods", "a.odt", "a.ofx", "a.pdf"}) {
            assertThat(ClienteDocumentoService.tipoPermitido(nome)).hasSizeLessThanOrEqualTo(tamanho);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"pagina.html", "script.js", "programa.exe", "imagem.svg", "sem-extensao"})
    void tiposRecusados(String nome) {
        assertThat(ClienteDocumentoService.tipoPermitido(nome)).isNull();
    }

    @Test
    void uploadInterno_recusaTipoNaoPermitido() {
        MockMultipartFile html = new MockMultipartFile("file", "pagina.html", "text/html", "<script>".getBytes());

        assertThatThrownBy(() -> service.upload(3L, html, null, "2026-11", null, "GERAL", "INTERNO", false))
                .isInstanceOf(RegraNegocioException.class);
        verify(documentoRepository, never()).save(any());
    }

    @Test
    void uploadInterno_gravaTipoPelaExtensaoENomeSeguro() throws Exception {
        MockMultipartFile ofx = new MockMultipartFile("file", "..\\pasta/extrato\"banco\".ofx", "text/html",
                "OFXHEADER:100".getBytes());

        ClienteDocumento doc = service.upload(3L, ofx, null, "2026-11", null, "GERAL", "INTERNO", false);

        assertThat(doc.getTipoArquivo()).isEqualTo("application/x-ofx");
        assertThat(doc.getNomeArquivo()).isEqualTo("extrato_banco_.ofx");
        assertThat(doc.getUrlArquivo()).doesNotContain("extrato");
    }
}
