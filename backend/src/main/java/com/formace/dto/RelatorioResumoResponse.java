package com.formace.dto;

import java.math.BigDecimal;

/** Resumo JSON do relatorio anual de prestacao de contas ao MP-SE. */
public record RelatorioResumoResponse(

        int ano,
        long totalImoveis,
        long imoveisOcupados,
        long imoveisVagos,
        long contratosAtivos,
        long totalLancamentos,
        long lancamentosPagos,
        long lancamentosAbertos,
        BigDecimal receitaPrevista,
        BigDecimal arrecadado,
        BigDecimal emAberto,
        BigDecimal multasEJuros) {
}
