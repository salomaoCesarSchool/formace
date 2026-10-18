package com.formace.dto;

import jakarta.validation.constraints.NotBlank;

/** Pedido de recuperacao de senha (envia o link por e-mail). */
public record EsqueciSenhaRequest(

        @NotBlank(message = "Informe o e-mail ou usuario da conta")
        String username) {
}
