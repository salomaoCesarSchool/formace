package com.formace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Payload de criacao/edicao de documento obrigatorio. */
public record DocumentoObrigatorioRequest(

        @NotBlank(message = "Modalidade e obrigatoria")
        @Size(max = 30, message = "Modalidade pode ter no maximo 30 caracteres")
        String modalidade,

        @NotBlank(message = "Destinatario e obrigatorio")
        @Pattern(regexp = "CLIENTE|FIADOR", message = "Destinatario deve ser CLIENTE ou FIADOR")
        String destinatario,

        @NotBlank(message = "Nome do documento e obrigatorio")
        @Size(max = 120, message = "Nome pode ter no maximo 120 caracteres")
        String nome,

        boolean obrigatorio) {
}
