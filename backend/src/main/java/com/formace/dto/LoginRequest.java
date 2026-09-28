package com.formace.dto;

import jakarta.validation.constraints.NotBlank;

/** Credenciais de login. */
public record LoginRequest(
        @NotBlank(message = "Usuario e obrigatorio") String username,
        @NotBlank(message = "Senha e obrigatoria") String password) {
}
