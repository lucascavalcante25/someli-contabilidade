package br.com.someli.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Em produção o Hibernate roda com ddl-auto=validate: coluna SMALLINT mapeada em Integer derruba a API
 * (aconteceu na V16, corrigida pela V17, e na V37, corrigida pela V38). Localmente o ddl-auto=update esconde o erro.
 */
class MigrationsTipoColunaTest {

    private static final Path PASTA = Path.of("src/main/resources/db/migration");
    private static final Pattern VERSAO = Pattern.compile("^V(\\d+)__.*\\.sql$");
    /** Migrations antigas já aplicadas em produção, cujo SMALLINT foi corrigido logo em seguida. */
    private static final int ULTIMA_COM_SMALLINT_CORRIGIDO = 38;

    @Test
    void migrationNovaNaoCriaSmallint_useInteger() throws IOException {
        List<String> comSmallint;
        try (Stream<Path> arquivos = Files.list(PASTA)) {
            comSmallint = arquivos
                    .filter(p -> versao(p) > ULTIMA_COM_SMALLINT_CORRIGIDO)
                    .filter(p -> conteudo(p).toLowerCase().contains("smallint"))
                    .map(p -> p.getFileName().toString())
                    .toList();
        }
        assertThat(comSmallint)
                .as("Use INTEGER: a entidade usa Integer e o validate de produção recusa SMALLINT")
                .isEmpty();
    }

    @Test
    void v38CorrigeOMesDaV37ParaInteger() {
        String v38 = conteudo(PASTA.resolve("V38__mes_vencimento_padrao_integer.sql"));
        assertThat(v38).containsIgnoringCase("mes_vencimento_padrao TYPE INTEGER");
    }

    private static int versao(Path p) {
        Matcher m = VERSAO.matcher(p.getFileName().toString());
        return m.matches() ? Integer.parseInt(m.group(1)) : -1;
    }

    private static String conteudo(Path p) {
        try {
            return Files.readString(p, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
