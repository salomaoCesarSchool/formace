package com.formace.exception;

/** Erro de regra de negocio / validacao de entrada (HTTP 400). */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String mensagem) {
        super(mensagem);
    }
}
