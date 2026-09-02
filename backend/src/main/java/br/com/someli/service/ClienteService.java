package br.com.someli.service;

import br.com.someli.domain.Cliente;
import br.com.someli.domain.Usuario;
import br.com.someli.dto.CreateClienteRequestDTO;
import br.com.someli.dto.UpdateClienteRequestDTO;
import br.com.someli.exception.ClienteNaoEncontradoException;
import br.com.someli.exception.RegraNegocioException;
import br.com.someli.repository.ClienteRepository;
import br.com.someli.repository.PagamentoMensalRepository;
import br.com.someli.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final PagamentoMensalRepository pagamentoMensalRepository;
    private final UsuarioRepository usuarioRepository;

    public ClienteService(ClienteRepository clienteRepository,
                         PagamentoMensalRepository pagamentoMensalRepository,
                         UsuarioRepository usuarioRepository) {
        this.clienteRepository = clienteRepository;
        this.pagamentoMensalRepository = pagamentoMensalRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public List<Cliente> listarTodos() {
        List<Cliente> clientes = clienteRepository.findAll();
        YearMonth atual = YearMonth.now();
        int mes = atual.getMonthValue();
        int ano = atual.getYear();
        LocalDate hoje = LocalDate.now();

        for (Cliente c : clientes) {
            boolean pago = pagamentoMensalRepository.findByClienteIdAndMesAndAno(c.getId(), mes, ano)
                    .map(p -> Boolean.TRUE.equals(p.getPago()))
                    .orElse(false);
            String status = calcularStatus(c.getDiaVencimento(), hoje, pago);
            c.setStatus(status);
        }
        return clientes;
    }

    private String calcularStatus(Integer diaVencimento, LocalDate hoje, boolean pago) {
        if (pago) return "em_dia";
        int dia = diaVencimento != null ? Math.min(diaVencimento, hoje.lengthOfMonth()) : 10;
        LocalDate vencimento = hoje.withDayOfMonth(dia);
        return hoje.isAfter(vencimento) ? "atrasado" : "pendente";
    }

    public Cliente buscarPorId(Long id) {
        if (id == null) {
            throw new RegraNegocioException("ID do cliente é obrigatório");
        }
        Cliente c = clienteRepository.findById(id)
                .orElseThrow(() -> new ClienteNaoEncontradoException("Cliente não encontrado para o ID informado"));
        YearMonth atual = YearMonth.now();
        boolean pago = pagamentoMensalRepository.findByClienteIdAndMesAndAno(c.getId(), atual.getMonthValue(), atual.getYear())
                .map(p -> Boolean.TRUE.equals(p.getPago()))
                .orElse(false);
        c.setStatus(calcularStatus(c.getDiaVencimento(), LocalDate.now(), pago));
        return c;
    }

    public Cliente criar(CreateClienteRequestDTO request) {
        String cnpjNormalizado = normalizarCnpjOpcional(request.getCnpj());
        validarCnpjDuplicado(cnpjNormalizado, null);

        Cliente cliente = new Cliente();
        preencherCampos(cliente, request, cnpjNormalizado);
        return Objects.requireNonNull(clienteRepository.save(cliente));
    }

    @SuppressWarnings("null")
    public Cliente atualizar(Long id, UpdateClienteRequestDTO request) {
        Cliente cliente = buscarPorId(id);
        String cnpjNormalizado = normalizarCnpjOpcional(request.getCnpj());
        validarCnpjDuplicado(cnpjNormalizado, id);

        preencherCampos(cliente, request, cnpjNormalizado);
        Cliente clienteAtualizado = clienteRepository.save(cliente);
        return Objects.requireNonNull(clienteAtualizado);
    }

    public void remover(Long id) {
        Cliente cliente = buscarPorId(id);
        clienteRepository.delete(Objects.requireNonNull(cliente));
    }

    private void preencherCampos(Cliente cliente, CreateClienteRequestDTO request, String cnpjNormalizado) {
        cliente.setCnpj(cnpjNormalizado);
        cliente.setRazaoSocial(request.getRazaoSocial().trim());
        cliente.setNomeFantasia(trimOrNull(request.getNomeFantasia()));
        cliente.setProprietario(trimOrNull(request.getProprietario()));
        cliente.setTelefone(trimOrNull(request.getTelefone()));
        cliente.setEmail(trimOrNull(request.getEmail()));
        cliente.setHonorario(request.getHonorario());
        cliente.setDiaVencimento(request.getDiaVencimento());
        cliente.setTipoPagamento(request.getTipoPagamento());
        cliente.setStatus(request.getStatus());
        cliente.setDataInicioCobranca(request.getDataInicioCobranca());
        cliente.setIndicacao(trimOrNull(request.getIndicacao()));
        cliente.setFormaPagamento(trimOrNull(request.getFormaPagamento()));
        cliente.setAtivo(request.getAtivo() != null ? request.getAtivo() : Boolean.TRUE);
        cliente.setResponsavel(resolverResponsavel(request.getResponsavelId()));
    }

    private Usuario resolverResponsavel(Long responsavelId) {
        if (responsavelId == null) {
            return null;
        }
        return usuarioRepository.findById(responsavelId)
                .orElseThrow(() -> new RegraNegocioException("Responsável não encontrado"));
    }

    private String normalizarCnpjOpcional(String cnpj) {
        if (cnpj == null || cnpj.isBlank()) {
            return null;
        }
        String digits = cnpj.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            return null;
        }
        if (digits.length() != 14) {
            throw new RegraNegocioException("CNPJ deve conter 14 dígitos");
        }
        return digits;
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validarCnpjDuplicado(String cnpj, Long idIgnorado) {
        if (cnpj == null || cnpj.isBlank()) {
            return;
        }
        boolean duplicado = idIgnorado == null
                ? clienteRepository.existsByCnpj(cnpj)
                : clienteRepository.existsByCnpjAndIdNot(cnpj, idIgnorado);
        if (duplicado) {
            throw new RegraNegocioException("Já existe cliente cadastrado com esse CNPJ");
        }
    }
}
