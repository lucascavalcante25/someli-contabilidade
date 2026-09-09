package br.com.someli.controller;

import br.com.someli.domain.PermissaoCodigo;
import br.com.someli.dto.GraficoMensalDTO;
import br.com.someli.dto.ResumoFinanceiroDTO;
import br.com.someli.service.AuthorizationService;
import br.com.someli.service.DespesaMensalService;
import br.com.someli.service.FinanceiroService;
import br.com.someli.service.PagamentoMensalService;
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

    public FinanceiroController(FinanceiroService financeiroService,
                                PagamentoMensalService pagamentoMensalService,
                                DespesaMensalService despesaMensalService,
                                AuthorizationService authorizationService) {
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
