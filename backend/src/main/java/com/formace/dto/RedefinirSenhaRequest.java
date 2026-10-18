package com.formace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Redefinicao de senha a partir do link recebido por e-mail. */
public record RedefinirSenhaRequest(

        @NotBlank(message = "Link de recuperacao invalido")
        String token,

        @NotBlank(message = "Senha e obrigatoria")
        @Size(min = 6, message = "Senha deve ter pelo menos 6 caracteres")
        String password) {
}
