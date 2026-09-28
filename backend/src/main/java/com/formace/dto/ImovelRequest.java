package com.formace.dto;

import com.formace.enums.StatusImovel;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Payload de criacao/atualizacao de imovel. */
public record ImovelRequest(

        @NotBlank(message = "Codigo e obrigatorio")
        @Size(max = 20, message = "Codigo pode ter no maximo 20 caracteres")
        String codigo,

        @NotBlank(message = "Endereco e obrigatorio")
        String endereco,

        String numero,

        @NotBlank(message = "Bairro e obrigatorio")
        String bairro,

        @NotBlank(message = "Cidade e obrigatoria")
        String cidade,

        String cep,

        @NotBlank(message = "Tipo e obrigatorio")
        String tipo,

        Integer quartos,
        Integer banheiros,
        Double metragem,

        @NotNull(message = "Valor do aluguel e obrigatorio")
        @DecimalMin(value = "0.00", message = "Valor do aluguel nao pode ser negativo")
        BigDecimal valorAluguel,

        @NotNull(message = "Valor do IPTU e obrigatorio")
        @DecimalMin(value = "0.00", message = "Valor do IPTU nao pode ser negativo")
        BigDecimal iptuMensal,

        @NotNull(message = "Status e obrigatorio")
        StatusImovel status,

        Long locatarioId,

        String observacao) {
}
