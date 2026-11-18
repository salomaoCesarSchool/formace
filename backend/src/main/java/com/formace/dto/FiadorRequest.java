package com.formace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Dados obrigatorios do fiador do contrato (nome, CPF, RG, nascimento,
 * estado civil, profissao, telefone e e-mail).
 */
public record FiadorRequest(

        @NotBlank(message = "Nome do fiador e obrigatorio")
        @Size(max = 160, message = "Nome do fiador pode ter no maximo 160 caracteres")
        String nome,

        @NotBlank(message = "CPF do fiador e obrigatorio")
        @Size(max = 20, message = "CPF do fiador pode ter no maximo 20 caracteres")
        String cpf,

        @Size(max = 30, message = "RG do fiador pode ter no maximo 30 caracteres")
        String rg,

        LocalDate dataNascimento,

        @Size(max = 30, message = "Estado civil pode ter no maximo 30 caracteres")
        String estadoCivil,

        @Size(max = 80, message = "Profissao pode ter no maximo 80 caracteres")
        String profissao,

        @Pattern(regexp = "^$|^[0-9 ()+\\-]{10,20}$",
                message = "Telefone do fiador invalido (use DDD + numero)")
        String telefone,

        @Pattern(regexp = "^$|^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "E-mail do fiador invalido")
        String email,

        @Size(max = 200, message = "Endereco do fiador pode ter no maximo 200 caracteres")
        String endereco) {
}
