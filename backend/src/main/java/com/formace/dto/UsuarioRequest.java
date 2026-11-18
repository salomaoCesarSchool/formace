package com.formace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Criacao/edicao de usuario pela tela de Acesso (somente ADMIN).
 * Na edicao, senha em branco ou nula mantem a senha atual.
 */
public record UsuarioRequest(
        @NotBlank(message = "Nome e obrigatorio")
        @Size(max = 160, message = "Nome deve ter no maximo 160 caracteres")
        String nome,

        @NotBlank(message = "Usuario e obrigatorio")
        @Size(max = 80, message = "Usuario deve ter no maximo 80 caracteres")
        String username,

        @Size(max = 160, message = "E-mail deve ter no maximo 160 caracteres")
        @Pattern(regexp = "^$|^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "E-mail invalido")
        String email,

        @NotBlank(message = "Perfil e obrigatorio")
        String role,

        @Size(min = 6, max = 120, message = "Senha deve ter ao menos 6 caracteres")
        String senha) {
}
