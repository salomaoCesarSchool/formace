package com.formace.dto;

import com.formace.entity.LancamentoFinanceiro;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** KPIs do dashboard + listas de apoio. */
public record DashboardResponse(

        long totalImoveis,
        long imoveisOcupados,
        long imoveisVagos,
        long contratosAtivos,
        long contratosAVencer,
        String mesReferencia,
        BigDecimal receitaMes,
        BigDecimal pendentesMes,
        long lancamentosPendentes,
        PagamentosMes pagamentosMes,
        Inadimplentes inadimplentes,
        List<CobrancaPendente> cobrancasPendentes,
        List<LancamentoFinanceiro> ultimosLancamentos,
        List<Alerta> alertas) {

    /** Situacao dos pagamentos de aluguel no mes (grafico do dashboard). */
    public record PagamentosMes(long pagos, long aVencer, long emAtraso, long total) {
    }

    /** Inquilinos que ainda nao pagaram o aluguel do mes vigente. */
    public record Inadimplentes(long quantidade, BigDecimal valorEmAberto) {
    }

    /** Cobranca pendente exibida na lista (nome, imovel, valor, vencimento e atraso). */
    public record CobrancaPendente(
            String locatario,
            String imovel,
            BigDecimal valor,
            LocalDate dataVencimento,
            int diasAtraso) {
    }

    /** Alerta exibido na coluna lateral do dashboard. */
    public record Alerta(String tipo, String mensagem, String severidade) {
    }
}
