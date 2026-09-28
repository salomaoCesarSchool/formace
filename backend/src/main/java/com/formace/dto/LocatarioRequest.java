package com.formace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Payload de criacao/atualizacao de locatario. */
public record LocatarioRequest(

        @NotBlank(message = "Nome e obrigatorio")
        @Size(max = 160, message = "Nome pode ter no maximo 160 caracteres")
        String nome,

        @NotBlank(message = "CPF/CNPJ e obrigatorio")
        @Size(max = 20, message = "CPF/CNPJ pode ter no maximo 20 caracteres")
        String cpfCnpj,

        String telefone,
        String email,
        String endereco,
        String cidade,
        String observacao) {
}
