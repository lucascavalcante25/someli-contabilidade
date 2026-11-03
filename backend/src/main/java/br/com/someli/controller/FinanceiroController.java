package br.com.someli.controller;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.BoletoEnviadoDTO;
import br.com.someli.dto.GraficoMensalDTO;
import br.com.someli.dto.PainelFinanceiroDTO;
import br.com.someli.dto.ResumoFinanceiroDTO;
import br.com.someli.service.AuthorizationService;
import br.com.someli.service.DespesaMensalService;
import br.com.someli.service.FinanceiroPainelService;
import br.com.someli.service.FinanceiroService;
import br.com.someli.service.PagamentoMensalService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/financeiro")
public class FinanceiroController {

    private final FinanceiroService financeiroService;
    private final PagamentoMensalService pagamentoMensalService;
    private final DespesaMensalService despesaMensalService;
    private final AuthorizationService authorizationService;
    private final FinanceiroPainelService financeiroPainelService;

    public FinanceiroController(FinanceiroService financeiroService,
                                PagamentoMensalService pagamentoMensalService,
                                DespesaMensalService despesaMensalService,
                                AuthorizationService authorizationService,
                                FinanceiroPainelService financeiroPainelService) {
        this.financeiroPainelService = financeiroPainelService;
        this.financeiroService = financeiroService;
        this.pagamentoMensalService = pagamentoMensalService;
        this.despesaMensalService = despesaMensalService;
        this.authorizationService = authorizationService;
    }

    @GetMapping("/resumo")
    public ResponseEntity<ResumoFinanceiroDTO> obterResumo(
            @RequestParam(defaultValue = "0") int mes,
            @RequestParam(defaultValue = "0") int ano) {
        authorizationService.requirePermission(PermissaoCodigo.FINANCEIRO_VISUALIZAR);
        int m = mes > 0 ? mes : java.time.Month.from(java.time.LocalDate.now()).getValue();
        int a = ano > 0 ? ano : java.time.Year.now().getValue();
        return ResponseEntity.ok(financeiroService.obterResumo(m, a));
    }

    @GetMapping("/grafico")
    public ResponseEntity<List<GraficoMensalDTO>> obterGrafico(
            @RequestParam(defaultValue = "0") int ano) {
        authorizationService.requirePermission(PermissaoCodigo.FINANCEIRO_VISUALIZAR);
        int a = ano > 0 ? ano : java.time.Year.now().getValue();
        return ResponseEntity.ok(financeiroService.obterDadosGrafico(a));
    }

    @GetMapping("/painel")
    public ResponseEntity<PainelFinanceiroDTO> obterPainel(
            @RequestParam(defaultValue = "0") int ano) {
        int a = ano > 0 ? ano : java.time.Year.now().getValue();
        return ResponseEntity.ok(financeiroPainelService.obter(a));
    }

    @PostMapping("/pagamentos/{clienteId}/marcar")
    public ResponseEntity<Void> marcarPagamento(
            @PathVariable Long clienteId,
            @RequestParam int mes,
            @RequestParam int ano) {
        authorizationService.requirePermission(PermissaoCodigo.FINANCEIRO_LANCAR);
        authorizationService.requireCompanyAccess(clienteId);
        pagamentoMensalService.marcarPago(clienteId, mes, ano);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/pagamentos/{clienteId}/desmarcar")
    public ResponseEntity<Void> desmarcarPagamento(
            @PathVariable Long clienteId,
            @RequestParam int mes,
            @RequestParam int ano) {
        authorizationService.requirePermission(PermissaoCodigo.FINANCEIRO_EDITAR);
        authorizationService.requireCompanyAccess(clienteId);
        pagamentoMensalService.desmarcarPago(clienteId, mes, ano);
        return ResponseEntity.ok().build();
    }

    public record BoletoEnviadoRequest(@NotNull Boolean enviado) {
    }

    /** Marca/desmarca o boleto do mês como enviado. Permissão e alçada são checadas no service. */
    @PutMapping("/pagamentos/{clienteId}/boleto-enviado")
    public ResponseEntity<BoletoEnviadoDTO> alterarBoletoEnviado(
            @PathVariable Long clienteId,
            @RequestParam int mes,
            @RequestParam int ano,
            @Valid @RequestBody BoletoEnviadoRequest request) {
        return ResponseEntity.ok(pagamentoMensalService.alterarBoletoEnviado(clienteId, mes, ano, request.enviado()));
    }

    @PostMapping("/despesas/{despesaId}/marcar")
    public ResponseEntity<Void> marcarDespesaPaga(
            @PathVariable Long despesaId,
            @RequestParam int mes,
            @RequestParam int ano) {
        authorizationService.requirePermission(PermissaoCodigo.DESPESAS_EDITAR);
        despesaMensalService.marcarPaga(despesaId, mes, ano);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/despesas/{despesaId}/desmarcar")
    public ResponseEntity<Void> desmarcarDespesaPaga(
            @PathVariable Long despesaId,
            @RequestParam int mes,
            @RequestParam int ano) {
        authorizationService.requirePermission(PermissaoCodigo.DESPESAS_EDITAR);
        despesaMensalService.desmarcarPaga(despesaId, mes, ano);
        return ResponseEntity.ok().build();
    }
}
