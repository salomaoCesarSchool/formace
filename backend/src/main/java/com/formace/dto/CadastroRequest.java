package com.formace.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload de cadastro de novo usuario (autoatendimento na tela de Login).
 * O username pode ser um e-mail ou um nome de usuario simples.
 */
public record CadastroRequest(

        @NotBlank(message = "Usuario e obrigatorio")
        @Size(max = 80, message = "Usuario deve ter no maximo 80 caracteres")
        String username,

        @NotBlank(message = "Senha e obrigatoria")
        @Size(min = 6, message = "Senha deve ter pelo menos 6 caracteres")
        String password,

        @Size(max = 160, message = "Nome deve ter no maximo 160 caracteres")
        String nome,

        @Email(message = "E-mail invalido")
        String email) {
}
