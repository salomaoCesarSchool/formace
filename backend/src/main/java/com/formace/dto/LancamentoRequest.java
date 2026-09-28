package com.formace.dto;

import com.formace.enums.NaturezaLancamento;
import com.formace.enums.TipoLancamento;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Payload de criacao de lancamento financeiro.
 * O backend valida todos os campos (Bean Validation) antes de tocar na camada de persistencia.
 */
public record LancamentoRequest(

        @NotNull(message = "Imovel e obrigatorio")
        Long imovelId,

        @NotNull(message = "Locatario e obrigatorio")
        Long locatarioId,

        Long contratoId,

        @NotNull(message = "Tipo e obrigatorio")
        TipoLancamento tipo,

        NaturezaLancamento natureza,

        @NotNull(message = "Valor do aluguel e obrigatorio")
        @DecimalMin(value = "0.00", message = "Valor do aluguel nao pode ser negativo")
        BigDecimal valorAluguel,

        @NotNull(message = "Valor do IPTU e obrigatorio")
        @DecimalMin(value = "0.00", message = "Valor do IPTU nao pode ser negativo")
        BigDecimal valorIptu,

        @NotBlank(message = "Mes de referencia e obrigatorio")
        @Pattern(regexp = "\\d{4}-\\d{2}", message = "Mes de referencia deve estar no formato AAAA-MM (ex.: 2026-09)")
        String mesReferencia,

        @NotNull(message = "Data de vencimento e obrigatoria")
        LocalDate dataVencimento,

        LocalDate dataPagamento,

        @PastOrPresent(message = "Data de pagamento nao pode ser no futuro")
        LocalDate dataCalculo,

        String descricao) {
}
