package com.formace.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.time.LocalDate;

/** Payload para quitar (pagar) um lancamento pendente/atrasado. */
public record PagarRequest(

        @NotNull(message = "Data de pagamento e obrigatoria")
        @PastOrPresent(message = "Data de pagamento nao pode ser no futuro")
        LocalDate dataPagamento) {
}
