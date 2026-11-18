package com.formace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Payload de criacao/atualizacao de locatario (cliente). */
public record LocatarioRequest(

        @NotBlank(message = "Nome e obrigatorio")
        @Size(max = 160, message = "Nome pode ter no maximo 160 caracteres")
        String nome,

        @NotBlank(message = "CPF/CNPJ e obrigatorio")
        @Size(max = 20, message = "CPF/CNPJ pode ter no maximo 20 caracteres")
        String cpfCnpj,

        @Size(max = 30, message = "RG pode ter no maximo 30 caracteres")
        String rg,

        LocalDate dataNascimento,

        @Size(max = 30, message = "Estado civil pode ter no maximo 30 caracteres")
        String estadoCivil,

        @Size(max = 80, message = "Profissao pode ter no maximo 80 caracteres")
        String profissao,

        @Pattern(regexp = "^$|^[0-9 ()+\\-]{10,20}$",
                message = "Telefone invalido (use DDD + numero)")
        String telefone,

        @Pattern(regexp = "^$|^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "E-mail invalido")
        @Size(max = 120, message = "E-mail pode ter no maximo 120 caracteres")
        String email,

        String endereco,
        String cidade,
        String observacao) {
}
