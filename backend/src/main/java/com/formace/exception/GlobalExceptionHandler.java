package com.formace.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Tratamento padrao de erros da API (respostas JSON previsiveis).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validacao(MethodArgumentNotValidException ex) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(f -> campos.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(erro(HttpStatus.BAD_REQUEST, "Dados invalidos", campos));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, Object>> regraNegocio(BadRequestException ex) {
        return ResponseEntity.badRequest().body(erro(HttpStatus.BAD_REQUEST, ex.getMessage(), null));
    }

    /** JSON malformado ou campos com formato invalido (ex.: data fora do padrao ISO). */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> corpoIlegivel(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body(erro(HttpStatus.BAD_REQUEST, "Corpo da requisicao invalido: " + ex.getMostSpecificCause().getMessage(), null));
    }

    /** Valores de enum invalidos vindos da query string (ex.: ?status=XXX) e afins. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> argumentoInvalido(IllegalArgumentException ex) {
        return ResponseEntity.badRequest()
                .body(erro(HttpStatus.BAD_REQUEST, "Parametro invalido: " + ex.getMessage(), null));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> naoEncontrado(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(erro(HttpStatus.NOT_FOUND, ex.getMessage(), null));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> credenciais(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(erro(HttpStatus.UNAUTHORIZED, "Usuario ou senha invalidos", null));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> acessoNegado(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(erro(HttpStatus.FORBIDDEN, "Acesso negado", null));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> uploadGrande(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(erro(HttpStatus.PAYLOAD_TOO_LARGE, "Arquivo maior que o limite permitido (20MB)", null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> generica(Exception ex) {
        log.error("Erro interno nao tratado", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(erro(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno no servidor", null));
    }

    private Map<String, Object> erro(HttpStatus status, String mensagem, Map<String, String> campos) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("erro", status.getReasonPhrase());
        body.put("mensagem", mensagem);
        if (campos != null && !campos.isEmpty()) {
            body.put("campos", campos);
        }
        return body;
    }
}
