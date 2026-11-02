package br.com.someli.integration;

import br.com.someli.exception.RegraNegocioException;

import javax.naming.ldap.LdapName;
import javax.naming.ldap.Rdn;
import java.io.ByteArrayInputStream;
import java.security.KeyStore;
import java.security.cert.X509Certificate;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lê um certificado ICP-Brasil A1 (.pfx/.p12) sem dependência externa.
 * CNPJ: OtherName OID 2.16.76.1.3.3 do SubjectAltName; na falta dele, o padrão "RAZÃO:CNPJ" do CN.
 */
public final class CertificadoA1Reader {

    public record Info(String cnpj, String titular, LocalDate validoAte, boolean vencido) {
    }

    /** DER do OID 2.16.76.1.3.3 (CNPJ da pessoa jurídica no padrão ICP-Brasil). */
    private static final byte[] OID_CNPJ = {0x06, 0x05, 0x60, 0x4C, 0x01, 0x03, 0x03};
    private static final Pattern CN_COM_CNPJ = Pattern.compile("^(.*?):(\\d{14})$");
    private static final String SENHA_OU_ARQUIVO_INVALIDO = "Senha incorreta ou arquivo de certificado inválido";

    private CertificadoA1Reader() {
    }

    public static KeyStore abrir(byte[] pfx, char[] senha) {
        try {
            KeyStore ks = KeyStore.getInstance("PKCS12");
            ks.load(new ByteArrayInputStream(pfx), senha);
            if (aliasComChave(ks) == null) {
                throw new RegraNegocioException("O arquivo não contém a chave privada do certificado");
            }
            return ks;
        } catch (RegraNegocioException e) {
            throw e;
        } catch (Exception e) {
            throw new RegraNegocioException(SENHA_OU_ARQUIVO_INVALIDO);
        }
    }

    public static Info ler(byte[] pfx, char[] senha) {
        KeyStore ks = abrir(pfx, senha);
        try {
            X509Certificate cert = (X509Certificate) ks.getCertificate(aliasComChave(ks));
            String cn = commonName(cert);
            String cnpj = cnpjDoSubjectAltName(cert);
            String titular = cn;
            Matcher m = cn != null ? CN_COM_CNPJ.matcher(cn) : null;
            if (m != null && m.matches()) {
                titular = m.group(1).trim();
                if (cnpj == null) cnpj = m.group(2);
            }
            LocalDate validoAte = cert.getNotAfter().toInstant().atZone(ZoneId.of("America/Sao_Paulo")).toLocalDate();
            boolean vencido = cert.getNotAfter().getTime() < System.currentTimeMillis();
            return new Info(cnpj, titular, validoAte, vencido);
        } catch (Exception e) {
            throw new RegraNegocioException(SENHA_OU_ARQUIVO_INVALIDO);
        }
    }

    static String aliasComChave(KeyStore ks) throws Exception {
        for (String alias : Collections.list(ks.aliases())) {
            if (ks.isKeyEntry(alias)) return alias;
        }
        return null;
    }

    private static String commonName(X509Certificate cert) throws Exception {
        for (Rdn rdn : new LdapName(cert.getSubjectX500Principal().getName()).getRdns()) {
            if ("CN".equalsIgnoreCase(rdn.getType())) return String.valueOf(rdn.getValue());
        }
        return null;
    }

    private static String cnpjDoSubjectAltName(X509Certificate cert) throws Exception {
        Collection<List<?>> sans = cert.getSubjectAlternativeNames();
        if (sans == null) return null;
        for (List<?> san : sans) {
            if (san.size() >= 2 && Integer.valueOf(0).equals(san.get(0)) && san.get(1) instanceof byte[] der) {
                String cnpj = cnpjDoOtherName(der);
                if (cnpj != null) return cnpj;
            }
        }
        return null;
    }

    /** Procura o OID do CNPJ no OtherName e devolve os 14 dígitos que vêm logo depois. */
    static String cnpjDoOtherName(byte[] der) {
        int pos = indexOf(der, OID_CNPJ);
        if (pos < 0) return null;
        StringBuilder digitos = new StringBuilder();
        for (int i = pos + OID_CNPJ.length; i < der.length; i++) {
            char c = (char) (der[i] & 0xFF);
            if (c >= '0' && c <= '9') {
                digitos.append(c);
                if (digitos.length() == 14) return digitos.toString();
            } else if (digitos.length() > 0) {
                digitos.setLength(0);
            }
        }
        return null;
    }

    private static int indexOf(byte[] haystack, byte[] needle) {
        outer:
        for (int i = 0; i <= haystack.length - needle.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) continue outer;
            }
            return i;
        }
        return -1;
    }
}
