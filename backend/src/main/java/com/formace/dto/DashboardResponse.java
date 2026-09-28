package com.formace.dto;

import com.formace.entity.LancamentoFinanceiro;

import java.math.BigDecimal;
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
        List<LancamentoFinanceiro> ultimosLancamentos,
        List<Alerta> alertas) {

    /** Alerta exibido na coluna lateral do dashboard. */
    public record Alerta(String tipo, String mensagem, String severidade) {
    }
}
