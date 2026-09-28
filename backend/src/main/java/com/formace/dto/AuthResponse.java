package com.formace.dto;

/** Resposta do login. */
public record AuthResponse(
        String token,
        String tokenType,
        long expiresInMs,
        String username,
        String nome,
        String role) {

    public static AuthResponse bearer(String token, long expiresInMs, String username, String nome, String role) {
        return new AuthResponse(token, "Bearer", expiresInMs, username, nome, role);
    }
}
