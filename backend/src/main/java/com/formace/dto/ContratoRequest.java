package com.formace.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Payload de criacao/atualizacao de contrato. */
public record ContratoRequest(

        @NotNull(message = "Imovel e obrigatorio")
        Long imovelId,

        @NotNull(message = "Locatario e obrigatorio")
        Long locatarioId,

        @NotNull(message = "Data de inicio e obrigatoria")
        LocalDate dataInicio,

        @NotNull(message = "Data de fim e obrigatoria")
        LocalDate dataFim,

        @NotNull(message = "Valor mensal e obrigatorio")
        @jakarta.validation.constraints.DecimalMin(value = "0.01", message = "Valor mensal deve ser maior que zero")
        BigDecimal valorMensal,

        @NotNull(message = "Dia de vencimento e obrigatorio")
        @Min(value = 1, message = "Dia de vencimento deve ser entre 1 e 28")
        @Max(value = 28, message = "Dia de vencimento deve ser entre 1 e 28")
        Integer diaVencimento,

        /** Modelo do contrato (ex.: Locacao residencial). */
        String modelo,

        /** Modalidade da garantia locaticia (FIADOR, CAUCAO, SEM_GARANTIA, SEGURO). */
        String modalidadeGarantia,

        /** Indice de reajuste acordado (ex.: IPCA, IGPM). */
        String indiceReajuste,

        /** Periodicidade do reajuste (Anual, Semestral...). */
        String periodicidadeReajuste,

        /** Dados do fiador — obrigatorio quando a garantia for FIADOR. */
        @Valid
        FiadorRequest fiador,

        String pdfUrl,

        String observacao) {
}
