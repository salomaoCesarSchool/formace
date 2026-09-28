package com.formace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Payload para associar um link de PDF ao contrato. */
public record PdfLinkRequest(

        @NotBlank(message = "Link do PDF e obrigatorio")
        @Size(max = 500, message = "Link pode ter no maximo 500 caracteres")
        String pdfUrl) {
}
