package com.formace.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Dia do fluxo de caixa / RDD (Relatorio Diario de Disponibilidade). */
public record FluxoDiarioResponse(
        LocalDate data,
        BigDecimal entradas,
        BigDecimal saidas,
        BigDecimal saldoDia,
        BigDecimal saldoAcumulado) {
}
