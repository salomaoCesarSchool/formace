package com.formace.exception;

/** Recurso inexistente (HTTP 404). */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String mensagem) {
        super(mensagem);
    }
}
